from django.shortcuts import render

from rest_framework import viewsets, mixins, permissions, status as http_status
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
    permission_classes = [permissions.AllowAny]   # no login required

    def partial_update(self, request, *args, **kwargs):
        # get the keys from the incoming request body
        keys = set(request.data.keys())
        # make sure only the "status" field is included in the update
        # if any other fields are present, return a 400 bad request response
        if keys != {"status"}:
            return Response(
                {"detail": "Only 'status' may be updated and it must be provided."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        # retrieve the object (incident report) being updated
        instance = self.get_object()
        # create a serializer with the current object and the incoming data
        # partial=True means it doesn't need all fields, just the ones provided
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        # validate the data - if invalid, this will raise an error automatically
        serializer.is_valid(raise_exception=True)
        # perform the update in the database
        self.perform_update(serializer)
        # return the updated object data as the response
        return Response(serializer.data)

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status") # checks if user wants a specific status
        return qs.filter(status=status_param) if status_param else qs # filter by status
