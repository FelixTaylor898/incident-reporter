# Felix Taylor
# 08/27/2025
from rest_framework.pagination import PageNumberPagination

class SmallPageNumberPagination(PageNumberPagination):
    """Custom pagination for API responses.

    - Default page size is 10 items.
    - Clients can override this with `?page_size=N` in the query string.
    - Maximum allowed page size is 100.
    """
    page_size = 10  # default number of items per page
    page_size_query_param = "page_size"
    max_page_size = 100