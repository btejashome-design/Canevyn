"""
Notifications & Alerts API Router
Returns high-contrast alert feeds with spoken narration for low-vision users.
Supports marking notifications read in SQLite so announcements fire once per status change.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.schemas import NotificationResponse
from backend.app.services.auth_service import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    category: Optional[str] = "all",
    current_user: dict = Depends(get_current_user)
):
    """Returns accessible notifications for user, optionally filtered by category."""
    with get_db() as conn:
        cursor = conn.cursor()
        if category and category != "all":
            cursor.execute("""
            SELECT * FROM notifications
            WHERE user_id = ? AND category = ?
            ORDER BY created_at DESC;
            """, (current_user["id"], category))
        else:
            cursor.execute("""
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC;
            """, (current_user["id"],))
        rows = cursor.fetchall()
        return [
            NotificationResponse(
                id=r["id"],
                category=r["category"],
                title=r["title"],
                subtitle=r["subtitle"],
                body=r["body"],
                spoken_narration=r["spoken_narration"],
                badge_text=r["badge_text"],
                is_read=bool(r["is_read"]) if "is_read" in r.keys() else False,
                created_at=str(r["created_at"])
            )
            for r in rows
        ]

@router.post("/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marks a notification as read in SQLite for the authenticated user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?;
        """, (notification_id, current_user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found."
            )
    return {"status": "success", "notification_id": notification_id}
