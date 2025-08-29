from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from .models import IncidentReport, Status
from django.utils import timezone
# Felix Taylor
# 08/27/2025

class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        cls.client = APIClient()

    def test_list_empty(self):
        url = reverse("incident-list") # get the url for the api
        r = self.client.get(url) # call get method
        self.assertEqual(r.status_code, 200) # OK
        self.assertIn("results", r.json()) # convert json to dict
        self.assertEqual(r.json()["results"], []) # assert results are empty

    def test_create_incident(self):
        url = reverse("incident-list")
        payload = {"title": "Car accident", "location": "1000 W Main St"}
        r = self.client.post(url, payload, format="json") # post test entry to api
        self.assertEqual(r.status_code, 201) # CREATED
        body = r.json()
        self.assertEqual(body["title"], payload["title"])
        self.assertEqual(body["location"], payload["location"])
        self.assertEqual(body["status"], Status.OPEN) # default status is open
        self.assertIn("created_at", body)
        self.assertEqual( # test creation was today
            body["created_at"][:10],
            str(timezone.now().date())
        )
        self.assertEqual(IncidentReport.objects.count(), 1) # only 1 incident so far

    def test_create_requires_title_and_location(self):
        url = reverse("incident-list")
        r = self.client.post(url, {"title": ""}, format="json") # post with empty title and location
        self.assertEqual(r.status_code, 400) # BAD REQUEST
        # Check if title or location are in the error response
        self.assertTrue(any(k in r.json() for k in ["title", "location"]))

    def test_pagination_first_page_has_page_wrapper(self):
        IncidentReport.objects.bulk_create([ # creates 15 new incidents
            IncidentReport(title=f"t{i}", location="l") for i in range(15)
        ])
        url = reverse("incident-list")
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200) # OK
        data = r.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(len(data["results"]), 10) # 10 incidents
        self.assertIsNotNone(data["next"]) # indicates there are more incidents in the next page
        self.assertIsNone(data["previous"]) # indicates there is no previous page
        r2 = self.client.get(url, {"page": 2}) # go to the next page
        data2 = r2.json()
        self.assertEqual(len(data2["results"]), 5) # next page has 5 incidents
        self.assertIsNotNone(data2["previous"])
        self.assertIsNone(data2["next"])

    def test_filter_by_status(self):
        IncidentReport.objects.create(title="a", location="x", status=Status.OPEN)
        IncidentReport.objects.create(title="b", location="y", status=Status.IN_PROGRESS)
        url = reverse("incident-list")
        r = self.client.get(url, {"status": Status.IN_PROGRESS})
        self.assertEqual(r.status_code, 200)
        results = r.json()["results"]
        self.assertTrue(all(item["status"] == Status.IN_PROGRESS for item in results))

        r = self.client.get(url, {"status": Status.OPEN})
        self.assertEqual(r.status_code, 200)
        results = r.json()["results"]
        self.assertTrue(all(item["status"] == Status.OPEN for item in results))

    def test_patch_status_allowed(self):
        inc = IncidentReport.objects.create(title="t", location="l", status=Status.OPEN)
        url = reverse("incident-detail", args=[inc.id])
        r = self.client.patch(url, {"status": Status.IN_PROGRESS}, format="json")

        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], Status.IN_PROGRESS)

    # checks if user is making an illegal update
    def test_patch_title_or_location_forbidden(self):
        inc = IncidentReport.objects.create(title="t", location="l", status=Status.OPEN)
        url = reverse("incident-detail", args=[inc.id])

        r1 = self.client.patch(url, {"title": "Fake title"}, format="json")
        self.assertEqual(r1.status_code, 400)
        self.assertIn("detail", r1.json())

        r2 = self.client.patch(url, {"location": "Fake address"}, format="json")
        self.assertEqual(r2.status_code, 400)
        self.assertIn("detail", r2.json())
    
    def test_delete_incident(self):
        inc = IncidentReport.objects.create(title="t", location="l", status=Status.OPEN)
        url = reverse("incident-detail", args=[inc.id])
        r = self.client.delete(url)
        self.assertIn(r.status_code, (200, 204))
        self.assertFalse(IncidentReport.objects.filter(id=inc.id).exists())

    def _create_with_status(self, status):
        inc = IncidentReport.objects.create(title="t", location="l", status=status)
        return inc, reverse("incident-detail", args=[inc.id])

    def test_patch_status_in_progress_to_resolved_allowed(self):
        inc, url = self._create_with_status(Status.IN_PROGRESS)
        r = self.client.patch(url, {"status": Status.RESOLVED}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], Status.RESOLVED)
        inc.refresh_from_db()
        self.assertEqual(inc.status, Status.RESOLVED)

    def test_patch_status_open_to_resolved_forbidden(self):
        inc, url = self._create_with_status(Status.OPEN)
        r = self.client.patch(url, {"status": Status.RESOLVED}, format="json")
        self.assertEqual(r.status_code, 400)
        inc.refresh_from_db()
        self.assertEqual(inc.status, Status.OPEN)

    def test_patch_status_in_progress_to_open_forbidden(self):
        inc, url = self._create_with_status(Status.IN_PROGRESS)
        r = self.client.patch(url, {"status": Status.OPEN}, format="json")
        self.assertEqual(r.status_code, 400)
        inc.refresh_from_db()
        self.assertEqual(inc.status, Status.IN_PROGRESS)

    def test_patch_status_resolved_cannot_change(self):
        inc, url = self._create_with_status(Status.RESOLVED)
        for target in (Status.IN_PROGRESS, Status.OPEN, Status.RESOLVED):
            r = self.client.patch(url, {"status": target}, format="json")
            self.assertEqual(r.status_code, 400)
        inc.refresh_from_db()
        self.assertEqual(inc.status, Status.RESOLVED)

    def test_patch_status_rejects_unknown_value(self):
        inc, url = self._create_with_status(Status.OPEN)
        r = self.client.patch(url, {"status": "not_a_real_status"}, format="json")
        self.assertEqual(r.status_code, 400)
        inc.refresh_from_db()
        self.assertEqual(inc.status, Status.OPEN)