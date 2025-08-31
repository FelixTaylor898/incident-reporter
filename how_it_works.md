**API**

The Incident class inherits the Model class, which comes with built-in behavior that allows it to be mapped to a DB. After this class is written, we run `python manage.py makemigrations` to create the migration files (i.e. instructions for how to turn the model into a SQLite table) and then `python manage.py migrate` to run them. If the model is modified, those commands are run again to modify the DB.

The `views.py` file contains controller logic and uses validation logic from `serializers.py`. IncidentReportViewSet inherits mixins that each specify a CRUD action, and GenericViewSet is the backbone that integrates those behaviors with DRF’s routing system. `pagination_class` uses `SmallPageNumberPagination` in `pagination.py` to enforce a default of 10 incidents per page and a maximum of 100. `queryset` is used to specify which model/table the view is working with, sorted by most recent.

`partial_update` ensures only `status` is being updated and uses `serializers.py` to validate it is being updated only to its legal next status.

`get_queryset` behaves normally with the exception of if a status filter is set by the user. If so, it only returns incidents with a matching status.

Running `python manage.py runserver` makes the endpoints accessible at `/api/incidents/` (as defined by `urls.py`). Running the `tests.py` file has all passing tests.

**Web View**

`urls.py` also defines `/incidents/` to use `incidents_page`, which serves `list.html`. The HTML page works with `incidents.js` to create the web view.

The HTML page primarily uses Bootstrap with a bit of custom-written CSS for styling. It also has a spinner that shows only once, upon initial load, by showing the "loading" element and hiding the "list" element. The initialLoad boolean is set to false after the initial fetch is made, and the spinner does not show again.

Also on initial render, the JS file sets all the necessary listeners so the classes work properly, checks for params, and buils the url for the API call (`buildApiUrl`). It passes that url to `loadByUrl`, which fetches the incidents. On success, it calls `renderList`, which updates the <ul> using the <template> to create <li> elements of each incident. The incidents' buttons make API calls and reload/update the UI, as does the creation form at the bottom of the page.

**Mobile App**

After ensuring `BACKEND_BASE_URL` in `index.tsx` has the correct IP LAN address, we run `python manage.py runserver 0.0.0.0:8000` on the back-end and `npx expo start` on the front-end, then scan the QR code with the Expo Go app. This serves `index.tsx`, the first thing this does is trigger `useEffect`, which calls `loadPage`. This uses `buildListUrl` to build the API url and fetch the incidents, then it sets all necessary variables.

The actual index.tsx functions similarly to the web view. However, it uses optimistic UI updating when changes are being made: it updates the UI before making the API call, then reverts the change upon failure. Also, the actual incidents are kept in their own IncidentCard, which have their own functions passed to them as props.