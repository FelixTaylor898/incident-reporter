from django.urls import path, include
from rest_framework.routers import DefaultRouter
from incidents.views import IncidentReportViewSet
from incidents.web import incidents_page

router = DefaultRouter()
router.register(r"incidents", IncidentReportViewSet, basename="incident")

urlpatterns = [
    path("api/", include(router.urls)), # where api is served
    path("incidents/", incidents_page, name="incidents_page"), # where webpage is served
]