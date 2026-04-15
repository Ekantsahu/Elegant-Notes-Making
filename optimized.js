  // Runs the code only after the full HTML page is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Selects all required DOM elements (buttons, inputs, modals, and containers)
  // to handle user interactions, UI updates, and note operations
  const notesContainer = document.getElementById("notesContainer");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const addNoteModal = document.getElementById("addNoteModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const noteForm = document.getElementById("noteForm");
  const searchInput = document.getElementById("searchInput");
  const filterSelect = document.getElementById("filterSelect");
  const emptyState = document.getElementById("emptyState");
  const confirmModal = document.getElementById("confirmModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  // Loads saved notes, sets up delete tracking and visible notes count,
  // then shows notes and checks if the list is empty
  let notes = JSON.parse(localStorage.getItem("notes")) || [];
  let filteredNotes = [...notes];

  let noteToDeleteId = null;

  // Pagination / Lazy Load
  let visibleCount = 10;
  const LOAD_STEP = 10;

  // Displays notes on the screen and checks whether to show the empty message
  renderNotes();
  updateEmptyState();

  // Attaches event listeners to handle user interactions like opening/closing modals,
  // submitting the form, searching, filtering, and confirming or canceling note deletion
  addNoteBtn.addEventListener("click", openAddNoteModal);
  closeModalBtn.addEventListener("click", closeAddNoteModal);
  noteForm.addEventListener("submit", handleNoteSubmit);
  filterSelect.addEventListener("change", filterNotes);
  cancelDeleteBtn.addEventListener("click", closeConfirmModal);
  confirmDeleteBtn.addEventListener("click", confirmDeleteNote);

  // Uses debounce to delay search execution for better performance
  searchInput.addEventListener("input", debounce(filterNotes, 500));

  // Uses event delegation to handle delete button clicks for all notes
  notesContainer.addEventListener("click", function (e) {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    // Gets the id of the clicked note and opens confirmation modal
    noteToDeleteId = Number(btn.getAttribute("data-id"));
    openConfirmModal();
  });

 
  // RENDER NOTES (Optimized)
  // Displays notes on the screen by creating elements dynamically,
  // showing only a limited number of notes and adding them efficiently to the page
  // Function to display notes on the screen
function renderNotes() {

    // Clears existing notes from the container before re-rendering
    notesContainer.innerHTML = "";

    // Creates a temporary container to improve performance while adding elements
    const fragment = document.createDocumentFragment();

    // Gets only the required number of notes based on visibleCount (for lazy loading)
    const notesToRender = filteredNotes.slice(0, visibleCount);

    // Loops through each note to create its UI
    notesToRender.forEach((note) => {

        // Creates a new div element for each note
        const noteElement = document.createElement("div");

        // Adds CSS classes for styling and animation
        noteElement.className = "note-card fade-in";

        // Sets the HTML structure for each note
        noteElement.innerHTML = `
            <div class="note-content">

                <!-- Header section with title and delete button -->
                <div class="note-header">
                    <h3 class="note-title">${note.title}</h3>
                    <div class="note-actions">
                        <!-- Delete button with note id -->
                        <button class="delete-btn" data-id="${note.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- Note content -->
                <p class="note-text">${note.content}</p>

                <!-- Footer with tag and date -->
                <div class="note-footer">
                    <span class="note-tag ${getTagClass(note.tag)}">
                        ${getTagIcon(note.tag)} ${getTagName(note.tag)}
                    </span>
                    <span class="note-date">${formatDate(note.date)}</span>
                </div>

            </div>`;

        // Adds the note element to the fragment (not directly to DOM)
        fragment.appendChild(noteElement);
    });

    // Finally appends all notes to the container at once (better performance)
    notesContainer.appendChild(fragment);
}

  // Function to handle adding a new note
function handleNoteSubmit(e) {

    // Prevents page reload when form is submitted
    e.preventDefault();

    // Gets and trims the note title input
    const title = document.getElementById("noteTitle").value.trim();

    // Gets and trims the note content input
    const content = document.getElementById("noteContent").value.trim();

    // Gets the selected tag (radio button)
    const tag = document.querySelector('input[name="noteTag"]:checked').value;

    // Checks if title or content is empty
    if (!title || !content) {

        // Shows alert if any field is empty
        alert("Please fill all fields");

        // Stops further execution
        return;
    }

    // Creates a new note object
    const newNote = {

        // Generates a unique id using current timestamp
        id: Date.now(),

        // Stores title
        title,

        // Stores content
        content,

        // Stores selected tag
        tag,

        // Stores current date in ISO format
        date: new Date().toISOString(),
    };

    // Adds the new note at the beginning of the notes array
    notes.unshift(newNote);

    // Saves updated notes to localStorage
    saveNotes();

    // Closes the add note modal
    closeAddNoteModal();

    // Clears search input for better user experience
    searchInput.value = "";

    // Resets filter to show all notes
    filterSelect.value = "all";

    // Re-applies filtering and updates UI
    filterNotes();
}


 // Function to confirm and delete a selected note
function confirmDeleteNote() {

    // Checks if a note is selected for deletion
    if (noteToDeleteId !== null) {

      // Removes the selected note by filtering it out using its id
      notes = notes.filter((note) => note.id !== noteToDeleteId);

      // Updates localStorage with the new notes list
      saveNotes();

      // Re-applies filtering and updates the UI
      filterNotes();

      // Closes the confirmation modal
      closeConfirmModal();
    }
}

  
 // Function to filter notes based on search input and selected category
function filterNotes() {

    // Gets the search text and converts it to lowercase for case-insensitive search
    const searchTerm = searchInput.value.toLowerCase();

    // Gets the selected filter value (category)
    const filterValue = filterSelect.value;

    // Filters notes based on search text and selected category
    filteredNotes = notes.filter((note) => {

      // Checks if title or content includes the search term
      const matchSearch =
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm);

      // Checks if note matches selected category or if "all" is selected
      const matchFilter = filterValue === "all" || note.tag === filterValue;

      // Returns notes that match both search and filter conditions
      return matchSearch && matchFilter;
    });

    // Resets visible notes count for pagination
    visibleCount = 10;

    // Re-renders the filtered notes on UI
    renderNotes();

    // Updates empty state message if no notes are found
    updateEmptyState(filteredNotes);
}


// Listens for scroll event and loads more notes when user reaches near bottom
window.addEventListener(
    "scroll",

    // Uses throttle to limit how often the scroll function runs (for performance)
    throttle(() => {

      // Checks if user has scrolled close to the bottom of the page
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 100
      ) {

        // Increases the number of visible notes
        visibleCount += LOAD_STEP;

        // Re-renders notes to show more items
        renderNotes();
      }
    }, 200),
);
  

// Saves notes array to localStorage after converting it to string format
function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

// Shows or hides empty state message based on notes availability
function updateEmptyState(notesToCheck = notes) {
  emptyState.style.display = notesToCheck.length === 0 ? "block" : "none";
}

// Delays function execution until user stops triggering it (used for search)
function debounce(fn, delay) {
  let timer; // stores timer reference

  return function () {
    clearTimeout(timer); // clears previous timer
    timer = setTimeout(fn, delay); // sets new delay
  };
}

// Limits how often a function runs (used for scroll events)
function throttle(fn, limit) {
  let waiting = false; // controls execution

  return function () {
    if (!waiting) {
      fn(); // runs function
      waiting = true; // blocks further calls
      setTimeout(() => (waiting = false), limit); // resets after delay
    }
  };
}

// Returns CSS class based on note tag
function getTagClass(tag) {
  return (
    {
      work: "tag-work",
      personal: "tag-personal",
      ideas: "tag-ideas",
      reminders: "tag-reminders",
    }[tag] || "" // default if no match
  );
}

// Returns icon HTML based on note tag
function getTagIcon(tag) {
  return (
    {
      work: '<i class="fas fa-briefcase"></i>',
      personal: '<i class="fas fa-user"></i>',
      ideas: '<i class="fas fa-lightbulb"></i>',
      reminders: '<i class="fas fa-bell"></i>',
    }[tag] || "" // default if no match
  );
}

// Returns readable tag name
function getTagName(tag) {
  return (
    {
      work: "Work",
      personal: "Personal",
      ideas: "Ideas",
      reminders: "Reminders",
    }[tag] || tag // fallback to original
  );
}

// Formats date into readable format
function formatDate(dateString) {
  const date = new Date(dateString); // converts string to date object

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Opens add note modal and disables background scroll
function openAddNoteModal() {
  addNoteModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Closes add note modal, enables scroll, and resets form
function closeAddNoteModal() {
  addNoteModal.classList.remove("active");
  document.body.style.overflow = "auto";
  noteForm.reset();
}

// Opens delete confirmation modal and disables background scroll
function openConfirmModal() {
  confirmModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Closes confirmation modal, enables scroll, and resets delete state
function closeConfirmModal() {
  confirmModal.classList.remove("active");
  document.body.style.overflow = "auto";
  noteToDeleteId = null;
}
});