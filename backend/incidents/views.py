from django.shortcuts import render

from rest_framework import viewsets, mixins, status as http_status
from rest_framework.response import Response
from .models import IncidentReport
from .serializers import IncidentReportSerializer
from .pagination import SmallPageNumberPagination
# Felix Taylor
# 08/27/2025

class IncidentReportViewSet(
    mixins.ListModelMixin, # allows GET
    mixins.CreateModelMixin, # allows POST
    mixins.UpdateModelMixin, # allows PATCH
    mixins.DestroyModelMixin, # allows DELETE
    viewsets.GenericViewSet,
):
    pagination_class = SmallPageNumberPagination # enforce pagination
    queryset = IncidentReport.objects.order_by("-created_at") # most recent is first
    serializer_class = IncidentReportSerializer # ensure validations

    def partial_update(self, request, *args, **kwargs):
        keys = set(request.data.keys())
        if keys != {"status"}:
            return Response(
                {"detail": "Only 'status' may be updated and it must be provided."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status") # checks if user wants a specific status
        return qs.filter(status=status_param) if status_param else qs # filter by status