from django.core.management.base import BaseCommand
from incidents.models import IncidentReport, Status
import random

class Command(BaseCommand):
    help = "Create 15 fake IncidentReport entries"

    def handle(self, *args, **kwargs):
        titles = [
            "Car accident", "Fire alarm", "Medical emergency", "Burglary reported",
            "Gas leak", "Lost child", "Traffic jam", "Flood warning",
            "Power outage", "Suspicious package", "Assault report", "Roadblock",
            "Animal control", "Water main break", "Noise complaint"
        ]
        locations = [
            "100 Main St", "200 Oak Ave", "Downtown Plaza", "Westside Park",
            "East Mall", "South Station", "North Bridge"
        ]
        statuses = [Status.OPEN, Status.IN_PROGRESS, Status.RESOLVED]

        for i in range(15):
            IncidentReport.objects.create(
                title=titles[i % len(titles)],
                location=random.choice(locations),
                status=random.choice(statuses),
            )

        self.stdout.write(self.style.SUCCESS("Created 15 incident reports"))
