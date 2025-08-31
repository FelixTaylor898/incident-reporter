from django.shortcuts import render
from .models import IncidentReport

def incidents_page(request):
    incidents = IncidentReport.objects.order_by("-created_at")[:]  # initial render
    return render(request, "incidents/list.html", {"incidents": incidents}) # deliver web page