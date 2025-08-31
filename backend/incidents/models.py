from django.db import models
# Felix Taylor
# 08/27/2025

class Status(models.TextChoices):
    """Incident status mock-enums."""
    OPEN = "open", "Open"                       # Incident has been recorded
    IN_PROGRESS = "in_progress", "In Progress"  # Responders are assigned and active
    RESOLVED = "resolved", "Resolved"           # Incident has been handled


class IncidentReport(models.Model):
    """Database model representing a single incident report.

    Fields:
        title (str): Short description of the incident.
        location (str): Where the incident occurred.
        status (str): Workflow state (open, in_progress, resolved).
        created_at (datetime): Timestamp when the record was created (defaults to now).
    """
    title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)