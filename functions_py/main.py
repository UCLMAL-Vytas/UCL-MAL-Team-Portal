import logging
from datetime import datetime, timezone

from firebase_functions import scheduler_fn
from firebase_admin import initialize_app, firestore
from google.auth import default, impersonated_credentials
from googleapiclient.discovery import build

logging.basicConfig(level=logging.INFO)

initialize_app()

ADMIN_EMAIL = "info@uclmal.com"
SERVICE_ACCOUNT = "usage-log-puller@portal-uclmal.iam.gserviceaccount.com"
SCOPES = ["https://www.googleapis.com/auth/admin.reports.audit.readonly"]


def _reports_service():
    """Build an Admin Reports API client impersonating the Workspace admin."""
    source_creds, _ = default()
    target_creds = impersonated_credentials.Credentials(
        source_credentials=source_creds,
        target_principal=ADMIN_EMAIL,
        target_scopes=SCOPES,
        lifetime=3600,
    )
    return build("admin", "reports_v1", credentials=target_creds)


@scheduler_fn.on_schedule(
    schedule="0 0 * * *",
    timezone="Europe/London",
    service_account=SERVICE_ACCOUNT,
)
def pull_drive_downloads(event: scheduler_fn.ScheduledEvent) -> None:
    """Pulls yesterday's Drive download audit events and stores them in Firestore."""
    service = _reports_service()
    db = firestore.client()

    # Page through all results
    request = service.activities().list(
        userKey="all",
        applicationName="drive",
        eventName="download",
        maxResults=1000,
    )

    total = 0
    while request is not None:
        response = request.execute()
        items = response.get("items", [])

        for activity in items:
            actor_email = activity.get("actor", {}).get("email", "")
            timestamp_str = activity.get("id", {}).get("time", "")

            try:
                downloaded_at = datetime.fromisoformat(
                    timestamp_str.replace("Z", "+00:00")
                )
            except ValueError:
                downloaded_at = datetime.now(timezone.utc)

            for evt in activity.get("events", []):
                params = {
                    p["name"]: p.get("value", "")
                    for p in evt.get("parameters", [])
                }
                doc_id = params.get("doc_id", "")
                doc_title = params.get("doc_title", "Unknown")
                doc_type = params.get("doc_type", "")
                drive_link = (
                    f"https://drive.google.com/file/d/{doc_id}"
                    if doc_id else ""
                )

                logging.info(
                    "DOWNLOAD | %s | %s | %s | %s",
                    timestamp_str, actor_email, doc_title, drive_link,
                )

                if not actor_email or not doc_id:
                    continue

                # Store under users/{email}/driveDownloads/{doc_id}
                # Using doc_id as the document key so re-runs are idempotent
                ref = (
                    db.collection("users")
                    .document(actor_email)
                    .collection("driveDownloads")
                    .document(doc_id)
                )
                ref.set(
                    {
                        "docId": doc_id,
                        "docTitle": doc_title,
                        "docType": doc_type,
                        "driveLink": drive_link,
                        "downloadedAt": downloaded_at,
                        "userEmail": actor_email,
                    },
                    merge=True,
                )
                total += 1

        request = service.activities().list_next(request, response)

    logging.info("Done. Stored %d download event(s) in Firestore.", total)
