**Coding Challenge**: The assignment is to create a simple Django back-end for incident reporting, along with an HTML front-end served with Django and an Expo React Native mobile component. The back-end will only be working with one model for incidents that includes the title, date, location, and status. The date is whenever the incident is posted via the API, and the status is either open, in_progress, or resolved. It's not necessary to be able to update title or location, but status should be able to be updated from open -> in_progress -> resolved.

Online resources I accessed for this project included:
* https://medium.com/vibentec-it/use-django-to-create-a-backend-application-37990f1f06cf
* https://docs.djangoproject.com/en/5.2/intro/tutorial01/
* https://www.w3schools.com/django/
* https://www.django-rest-framework.org/api-guide/serializers/
* https://docs.djangoproject.com/en/4.0/topics/class-based-views/mixins/
* https://www.django-rest-framework.org/api-guide/pagination/
* https://getbootstrap.com/docs/5.0/getting-started/introduction/
* https://www.w3schools.com/tags/tag_template.asp

__**Approach**__

**Getting Started**: My first step was to research the steps necessary to set up the project files/directories, and what sort of frameworks or libraries would be needed for the backend. I did have prior experience with Django for a personal project I worked on in the past, but I needed to brush-up on the basics. I used a combination of ChatGPT, StackOverflow, and other online resources for this, as I did for most of the project. In general, I use AI to teach me concepts and terms, rather than to directly write code for me, unless it's for housekeeping code (e.g. testing, automatic incident creation, quick bug fixes) or chunks of code that have complicated formatting, like API calls or string manipulation.

The second step was to set up the venv in order to isolate this project's dependencies from the rest of my system, and also allowing for easy portability, as others could run my project using the specifications included in requirements.txt.

After the files were generated, I researched further to learn how to connect the database, model, controller, and url/endpoints for the back-end creation.

**Back-end:**: Next step was to set up the model. Title/location are standard CharField and created_at is DateTimeField, but status is one of three TextChoices. This is to ensure status cannot hold any other value than one of the three provided, similar to an enum. After the incident model was written, I ran migrations to ensure it became a table in my SQLite database.

Next step was to set up the views. The first part of this was to write a serializer, which is a bridge between Django and JSON, and is also where validation goes. As such, this file included validation to ensure statuses can only be updated to the correct next status in the cycle. The validation included the code "raise serializers.ValidationError" which throws a 400 Bad Request to the client.

Django is convenient for back-end creation as ViewSets allows for CRUD operations to be automatically added, unlike other back-end frameworks like Spring Boot. This coupled with the fact that there was only one model streamlined the process of writing views.py. I used mixins to specify which actions I wanted to include in the CRUD operations, and I included all four in the acronym. Delete wasn't required by the project, but I included it so I could test things more easily later. The next step was to override partial_update to ensure it wasn't updating anything other than status (the exact status validation is handled by the serializer), and I also added the ability to filter the result set by specific statuses. The result set is also always ordered from most recent to oldest. AI helped me figure out how to handle the controller and gave me some boilerplate code that I could flesh out myself (as well as accessing other online resources).

Some more simple housekeeping code I had ChatGPT generate for me was that of urls.py. The line path("incidents/", incidents_page, name="incidents_page") came later.

After this, I hit a bit of a roadblock trying to find an extension that would automatically generate docstrings for my files, but I couldn't get it to work, so I moved on to pagination, which was simple to implement using an online tutorial.

After the views was set up, I had ChatGPT write a seed file and a test file so I could ensure everything was working smoothly, along with a few manual tests in the command line.

**Web View**: ChatGPT walked me through setting up the web view, first creating web.py, then adding the url to urls.py, then setting up the folders/files necessary for delivering the list.html. I had it write some boilerplate code for list.html, then I began working on list.html, incidents.js, and style.css.

I decided pretty quick to use Bootstrap for styling, because I had prior experience with it, and I find it convenient to use. I worked on the webpage from the top down, first setting up the <head> element with necessary imports and titling. I attempted to add a favicon, but for some reason I could not get it to display properly, so I decided to go without, since it wasn't a requirement anyway. I also added the import for incidents.js at the bottom.

I also decided to try to model the Vantage AI app for styling as best as I could, so that dictated the colors, shapes, etc. I consulted the Bootstrap documentation to find what I needed, but in moments I struggled (e.g. for things like sizing), I had ChatGPT generate the necessary classes for me.

After setting up the title header, the obvious next step was to connect to the API. I recalled the <template> tag as a useful method of hiding an element until JS activates it, so I set that up. Additionally, ChatGPT helped me to write the API call on the JS file (after determining how to structure the JS file, i.e. page loads -> loadByUrl -> renderList). With some direction from AI, I wrote the code for these steps myself, with the exception of the creation date element, which had a somewhat complex means of setting it up, i.e. using toLocaleString to make it more human-readable and resemble the app more accurately. I also had ChatGPT help me with building the page's URL from the user's params. After getting the web page to display the list of incidents, I implemented some Bootstrap and basic CSS, then implemented the delete button and "cycle status" button. I had some issues getting the cycle status button to hide when an incident was already resolved, but I was able to use visibility = "hidden" to accomplish this. After verifying that these buttons worked correctly, I added a message on the page itself that disappears after 3 seconds whenever an action is taken. I experimented with adding a little sound effect as well, but removed it after having some issues with it.

After that, I set up the page navigation, page and incident count display, page size select option, and status filtering. I pulled a "loading" icon from a previous project of mine to use when the page loads. Initially, it was loading every time the list was being rendered, which led to it continuously loading whenever the page size was changed or the status was filtered. I added a simple boolean to make it so the loading icon only shows on initial render.

After insuring everything was working properly and the styling was satisfactory, I added the "create incident" form, which was fairly straightforward and only required an event listening and not its own function. 