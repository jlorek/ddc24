// DOM-Elemente
const sessionList = document.getElementById('session-list');
const selectedSessionsList = document.getElementById('selected-sessions');
const clearPlanButton = document.getElementById('clear-plan');

// Globale Variable zum Speichern aller Sessions
let allSessions = [];

// Laden der ausgewählten Sessions aus dem Local Storage
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM vollständig geladen. Starte das Laden der Sessions...');
    await loadSessions(); // Warten bis Sessions geladen sind
    loadSelectedSessions(); // Jetzt die ausgewählten Sessions laden
    attachClearPlanListener();
});

// Funktion zum Laden der Sessions aus JSON
async function loadSessions() {
    try {
        console.log('Versuche, sessions.json zu laden...');
        const response = await fetch('sessions.json'); // Pfad zur JSON-Datei
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const sessions = await response.json();
        allSessions = sessions; // Speichern aller Sessions
        console.log('Sessions erfolgreich geladen:', sessions);

        // Gruppiere Sessions nach Tagen und dann nach Zeiten
        const sessionsByDayAndTime = sessions.reduce((acc, session) => {
            if (!acc[session.day]) {
                acc[session.day] = {};
            }
            const time = session.time || 'Ungeplante Zeit'; // Falls keine Zeit angegeben ist
            if (!acc[session.day][time]) {
                acc[session.day][time] = [];
            }
            acc[session.day][time].push(session);
            return acc;
        }, {});

        console.log('Sessions nach Tagen und Zeiten gruppiert:', sessionsByDayAndTime);

        // Holen der ausgewählten Sessions aus dem Local Storage
        const selected = JSON.parse(localStorage.getItem('selectedSessions')) || [];
        console.log('Ausgewählte Sessions aus Local Storage:', selected);

        // Erstelle die HTML-Struktur für jeden Tag und Zeitblock
        for (const [day, times] of Object.entries(sessionsByDayAndTime)) {
            const daySection = document.createElement('div');
            daySection.classList.add('day-section');

            const dayHeader = document.createElement('h3');
            dayHeader.textContent = day;
            daySection.appendChild(dayHeader);

            for (const [time, timeSessions] of Object.entries(times)) {
                const timeSection = document.createElement('div');
                timeSection.classList.add('time-section');

                const timeHeader = document.createElement('h4');
                timeHeader.textContent = time;
                timeSection.appendChild(timeHeader);

                const ul = document.createElement('ul');

                timeSessions.forEach(session => {
                    const li = document.createElement('li');
                    if (session.selectable) {
                        // Überprüfen, ob die Session bereits ausgewählt ist
                        const isChecked = selected.includes(String(session.id));
                        li.innerHTML = `
                            <input type="checkbox" id="session${session.id}" data-session-id="${session.id}" ${isChecked ? 'checked' : ''}>
                            <label for="session${session.id}">
                                <strong>${session.title}</strong><br>
                                <em>${session.speaker}</em><br>
                                ${session.location ? session.location : ''}<br>
                                <small>${session.description ? session.description : ''}</small>
                            </label>
                        `;
                    } else {
                        li.innerHTML = `
                            <span>
                                <strong>${session.title}</strong><br>
                                ${session.location ? session.location : ''}<br>
                            </span>
                        `;
                    }
                    ul.appendChild(li);
                });

                timeSection.appendChild(ul);
                daySection.appendChild(timeSection);
            }

            sessionList.appendChild(daySection);
        }

        console.log('Alle Sessions wurden zum DOM hinzugefügt.');
        attachCheckboxListeners();
    } catch (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        alert('Fehler beim Laden der Sessions. Bitte überprüfe die Konsole für weitere Details.');
    }
}

// Funktion zum Laden der ausgewählten Sessions
function loadSelectedSessions() {
    const selected = JSON.parse(localStorage.getItem('selectedSessions')) || [];
    console.log('Ausgewählte Sessions aus Local Storage:', selected);

    // Render die ausgewählten Sessions sortiert
    renderSelectedSessions(selected);
}

// Funktion zum Anhängen von Event-Listenern an die Checkboxen
function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#session-list input[type="checkbox"]');
    console.log(`Füge Event-Listener zu ${checkboxes.length} Checkboxen hinzu.`);

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const sessionId = e.target.dataset.sessionId;
            console.log(`Checkbox für Session ID ${sessionId} wurde geändert. Checked: ${e.target.checked}`);

            let selected = JSON.parse(localStorage.getItem('selectedSessions')) || [];

            if (e.target.checked) {
                if (!selected.includes(sessionId)) {
                    selected.push(sessionId);
                    console.log(`Session ID ${sessionId} zum ausgewählten Plan hinzugefügt.`);
                }
            } else {
                selected = selected.filter(id => id !== sessionId);
                console.log(`Session ID ${sessionId} aus dem ausgewählten Plan entfernt.`);
            }

            localStorage.setItem('selectedSessions', JSON.stringify(selected));
            renderSelectedSessions(selected);
        });
    });
}

// Funktion zum Rendern der ausgewählten Sessions in "Mein Plan" sortiert nach Tag und Zeit
function renderSelectedSessions(selectedIds) {
    // Leere die aktuelle Liste
    selectedSessionsList.innerHTML = '';

    // Filtere die ausgewählten Sessions aus allSessions
    const selectedSessions = allSessions.filter(session => selectedIds.includes(String(session.id)));

    // Sortiere die ausgewählten Sessions nach Tag und Zeit
    selectedSessions.sort((a, b) => {
        // Zuerst nach Tag
        const dayOrder = { "Dienstag": 1, "Mittwoch": 2 };
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }

        // Dann nach Zeit
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        return timeA - timeB;
    });

    // Füge die sortierten Sessions zur Liste hinzu
    selectedSessions.forEach(session => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${session.title}</strong><br>
            <em>${session.speaker}</em><br>
            ${session.time ? session.time + ', ' : ''}${session.location ? session.location : ''}<br>
            <small>${session.description ? session.description : ''}</small>
        `;
        selectedSessionsList.appendChild(li);
    });

    console.log('Mein Plan wurde aktualisiert.');
}

// Hilfsfunktion zum Parsen der Zeit in Minuten seit Mitternacht
function parseTime(timeStr) {
    if (!timeStr || timeStr === 'Ungeplante Zeit') return 0;
    const [start, ] = timeStr.split(' - ');
    const [hours, minutes] = start.split(':').map(Number);
    return hours * 60 + minutes;
}

// Funktion zum Event-Listener für den "Plan löschen" Button
function attachClearPlanListener() {
    clearPlanButton.addEventListener('click', () => {
        console.log('Lösche alle ausgewählten Sessions.');
        // Alle Checkboxen deaktivieren
        const checkboxes = document.querySelectorAll('#session-list input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // "Mein Plan" leeren
        selectedSessionsList.innerHTML = '';
        console.log('Mein Plan wurde geleert.');

        // Local Storage leeren
        localStorage.removeItem('selectedSessions');
        console.log('Local Storage wurde geleert.');
    });
}