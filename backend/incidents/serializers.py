# serializers.py
from rest_framework import serializers
from .models import IncidentReport, Status  # Status = TextChoices

class IncidentReportSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=Status.choices,
        required=False,
        default=Status.OPEN,
    )

    class Meta:
        model = IncidentReport
        fields = ["id", "title", "location", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_status(self, value):
        instance = getattr(self, "instance", None)
        if not instance:
            # On create, allow whatever your model defaults/accepts (usually Status.OPEN)
            return value

        current = instance.status  # e.g. "resolved"

        # Hard stop: once resolved, no further status changes at all
        if current == Status.RESOLVED:
            raise serializers.ValidationError("Resolved incidents cannot be updated.")

        # Enforce forward-only transitions
        allowed = {
            Status.OPEN: {Status.IN_PROGRESS},
            Status.IN_PROGRESS: {Status.RESOLVED},
        }
        if value not in allowed.get(current, set()):
            raise serializers.ValidationError(
                f"Cannot change status from '{current}' to '{value}'."
            )

        return value
