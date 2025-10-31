let scheduleContainerInstance = null;

window.initSchedulePage = function() {
    // Clean up previous instance if it exists
    if (scheduleContainerInstance) {
        if (window.functionalCalendar) {
            window.functionalCalendar = null;
        }
        if (window.calendarInitialized) {
            window.calendarInitialized = false;
        }
    }
    
    // Create new instance
    scheduleContainerInstance = new ScheduleContainer();
};

// Auto-initialize when script loads AND we're on SchedulePage
if (document.body.dataset.page === 'SchedulePage') {
    setTimeout(() => {
        window.initSchedulePage();
    });
}

class ScheduleContainer {
    constructor() {
        this.API_BASE = "https://vxukqznjkdtuytnkhldu.supabase.co/rest/v1";
        this.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NDE4MCwiZXhwIjoyMDc2ODIwMTgwfQ.7hCf7BDqlVuNkzP1CcbORilAzMqOHhexP4Y7bsTPRJA";
        this.approvedEvents = [];
        this.currentClientFilter = 'all';
        window.scheduleContainer = this;

        // Wait for globals
        this.waitForGlobals().then(() => {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => this.init());
            } else {
                setTimeout(() => this.init());
            }
        });
    }

    async waitForGlobals() {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (typeof checkAuth === "function") {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    async init() {
        if (!document.querySelector(".schedule-content")) {
            setTimeout(() => this.init(), 100);
            return;
        }

        if (!checkAuth()) return;

        await this.loadSchedule();
        this.initializeCalendarWithEvents();
        document.querySelector('.schedule-content').classList.add('ready');
    }

    // LOAD SCHEDULE - Using direct Supabase calls
    async loadSchedule() {
        try {
            // Use direct Supabase call like in GuestController
            const response = await fetch(`${this.API_BASE}/event_plans?status=eq.Approved&select=*`, {
                headers: {
                    'apikey': this.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();
            this.approvedEvents = data || [];
            
            // Populate client dropdown
            this.populateClientFilter();
            
            return true;
        } catch (error) {
            console.error("Failed to load schedule:", error);
            showNotification("Failed to load schedule", "error");
            return false;
        }
    }

    // ... rest of your ScheduleContainer methods remain the same
    populateClientFilter() {
        const clientDropdown = document.querySelector('.client-dropdown');
        if (!clientDropdown) return;

        const uniqueClients = [...new Set(this.approvedEvents.map(event => event.client_name))];
        
        clientDropdown.innerHTML = `
            <div class="client-filter-select">
                <div class="dropdown-selected" onclick="toggleClientDropdown()">
                    All Clients ▼
                </div>
                <div class="dropdown-selected-menu" id="dropdownMenu">
                ${uniqueClients.map(client => `
                    <div class="dropdown-selected-item" onclick="scheduleContainer.filterByClient('${client}')">
                        ${client}
                    </div>
                `).join('')}
                </div>
            </div>
            `;
    }

    filterByClient(clientName) {
        this.currentClientFilter = clientName;
        this.initializeCalendarWithEvents();

        const fc = window.functionalCalendar;
        if (!fc) return;

        const filteredEvents = this.getFilteredEvents();

        if (filteredEvents.length > 0) {
            // 🗓️ Get the first event date for that client
            const firstEventDate = new Date(filteredEvents[0].event_date);

            // Update the calendar's selected date
            fc.selectedDate = firstEventDate;
            fc.currentDate = firstEventDate;

            // Re-render the calendar to visually jump to that month/day
            fc.renderCalendar();
            fc.loadEventsForDate(firstEventDate);
        } else {
            // If no events found for client, clear timeline
            fc.loadEventsForDate(fc.selectedDate);
        }
    }

    // GET FILTERED EVENTS
    getFilteredEvents() {
        if (this.currentClientFilter === 'all') {
            return this.approvedEvents;
        }
        return this.approvedEvents.filter(event => 
            event.client_name === this.currentClientFilter
        );
    }

    // INITIALIZE CALENDAR WITH EVENTS
    initializeCalendarWithEvents() {
        // Remove the safety check since we're already registered in constructor
        if (!window.calendarInitialized) {
            if (initializeCalendar()) {
                window.calendarInitialized = true;
            }
        } else {
            // Refresh events in existing calendar
            const functionalCalendar = window.functionalCalendar;
            if (functionalCalendar) {
                functionalCalendar.loadEventsForDate(functionalCalendar.selectedDate);
            }
        }
    }
}

// INITIALIZE THE SCHEDULE CONTAINER
const scheduleContainer = new ScheduleContainer();

// FUNCTIONAL CALENDAR
class FunctionalCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.today = new Date();
        
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Store reference globally for access
        window.functionalCalendar = this;

        this.updateDateDisplay();
        this.init();
    }

    updateDateDisplay() {
        const dateTitle = document.querySelector('.date-title');
        if (dateTitle) {
            const monthName = this.monthNames[this.selectedDate.getMonth()];
            dateTitle.textContent = `${monthName} ${this.selectedDate.getDate()}, ${this.selectedDate.getFullYear()}`;
        }

        // Update the month navigation
        const monthDisplay = document.querySelector('.month-nav span:nth-child(2)');
        if (monthDisplay) {
            const monthName = this.monthNames[this.currentDate.getMonth()];
            const year = this.currentDate.getFullYear();
            
            if (this.isSelectedMonth()) {
                monthDisplay.textContent = `${monthName} ${this.selectedDate.getDate()}, ${year}`;
            } else {
                monthDisplay.textContent = `${monthName} ${year}`;
            }
        }
    }

    // INIT FUNCTION
    init() {
        console.log("Initializing FunctionalCalendar...");
        this.updateDateDisplay();
        this.bindEvents();
        this.generateCalendarDays();
        this.addClickEventsToExistingCells();
        this.loadEventsForDate(this.selectedDate);
        console.log("FunctionalCalendar initialized successfully!");
    }   
    
    // BIND CLICK EVENTS
    bindEvents() {
        console.log("Binding events...");
        
        const prevArrow = document.querySelector('.nav-arrow:first-child');
        const nextArrow = document.querySelector('.nav-arrow:last-child');
        
        console.log("Previous arrow found:", !!prevArrow);
        console.log("Next arrow found:", !!nextArrow);
        
        if (prevArrow) {
            prevArrow.addEventListener('click', () => {
                console.log("Previous month clicked");
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }
        
        if (nextArrow) {
            nextArrow.addEventListener('click', () => {
                console.log("Next month clicked");
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }
    }
    
    // ADD CLICK EVENTS TO EXISTING  CELLS
    addClickEventsToExistingCells() {
        const calendarCells = document.querySelectorAll('.calendar-cell:not(.other-month):not(.calendar-header-cell)');
        console.log("Found calendar cells:", calendarCells.length);
        
        calendarCells.forEach((cell, index) => {
            console.log(`Adding click to cell ${index + 1}: ${cell.textContent}`);
            cell.addEventListener('click', () => {
                const day = parseInt(cell.textContent);
                if (!isNaN(day)) {
                    console.log(`Date selected: ${this.currentDate.getMonth() + 1}/${day}/${this.currentDate.getFullYear()}`);
                    this.selectDate(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
                }
            });
        });
    }
    
    // RENDER CALENDAR
    renderCalendar() {
        this.updateMonthDisplay();
        this.generateCalendarDays();
    }

    isSelectedMonth() {
        return this.currentDate.getFullYear() === this.selectedDate.getFullYear() &&
            this.currentDate.getMonth() === this.selectedDate.getMonth();
    }

    isSelectedDate(year, month, day) {
        return this.selectedDate.getFullYear() === year &&
                this.selectedDate.getMonth() === month &&
                this.selectedDate.getDate() === day;
    }

    isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
    }
    
    // UPDATE MONTH DISPLAY
    updateMonthDisplay() {
        const monthDisplay = document.querySelector('.month-nav span:nth-child(2)');
        
        if (!monthDisplay) {
            console.warn("Month display element not found");
            return;
        }
        
        const monthName = this.monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        
        if (this.isSelectedMonth()) {
            monthDisplay.textContent = `${monthName} ${this.selectedDate.getDate()}, ${year}`;
        } else {
            monthDisplay.textContent = `${monthName} ${year}`;
        }
    }
    
    // GENERATE CALENDAR DAYS
    generateCalendarDays() {
        const calendarGrid = document.querySelector('.calendar-grid');
        
        if (!calendarGrid) {
            console.error("Calendar grid not found");
            return;
        }
        
        const existingCells = calendarGrid.querySelectorAll('.calendar-cell');
        existingCells.forEach(cell => cell.remove());
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        let startDayOfWeek = (firstDay.getDay() + 6) % 7;
        
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const cell = this.createDayCell(day, 'other-month', year, month - 1);
            calendarGrid.appendChild(cell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            let classes = '';
            
            if (this.isSelectedDate(year, month, day)) {
                classes += 'today ';
            }
            
            if (this.isToday(year, month, day)) {
                classes += 'actual-today ';
            }
            
            const cell = this.createDayCell(day, classes, year, month);
            calendarGrid.appendChild(cell);
        }
        
        const totalCells = calendarGrid.children.length - 7;
        const remainingCells = Math.max(0, 42 - totalCells);
        
        for (let day = 1; day <= remainingCells; day++) {
            const cell = this.createDayCell(day, 'other-month', year, month + 1);
            calendarGrid.appendChild(cell);
        }
    }
    
    // CREATE DAY CELL
    createDayCell(day, classes, year, month) {
        const cell = document.createElement('div');
        cell.className = `calendar-cell ${classes}`.trim();
        cell.textContent = day;
        
        if (!classes.includes('other-month')) {
            cell.addEventListener('click', () => {
                console.log(`Date selected: ${month + 1}/${day}/${year}`);
                this.selectDate(year, month, day);
            });
        }
        
        return cell;
    }
    
    // SELECT DATE
    selectDate(year, month, day) {
        document.querySelectorAll('.calendar-cell.today').forEach(cell => {
            cell.classList.remove('today');
        });
        
        this.selectedDate = new Date(year, month, day);
        this.currentDate = new Date(year, month, day);
        
        const dateTitle = document.querySelector('.date-title');
        if (dateTitle) {
            const monthName = this.monthNames[month];
            dateTitle.textContent = `${monthName} ${day}, ${year}`;
        }
        
        const allCells = document.querySelectorAll('.calendar-cell');
        allCells.forEach(cell => {
            if (cell.textContent == day && !cell.classList.contains('other-month')) {
                cell.classList.add('today');
            }
        });
        
        this.renderCalendar();
        this.loadEventsForDate(this.selectedDate);
    }
    
    // LOAD EVENTS FOR DATE
    loadEventsForDate(date) {
        const events = this.getEventsForDate(date);
        this.renderEvents(events);
    }

    // GET EVENTS FOR DATE
    getEventsForDate(date) {
        if (!window.scheduleContainer) {
            console.warn("Schedule container not available");
            return [];
        }

        const filteredEvents = window.scheduleContainer.getFilteredEvents();
        const dateKey = this.formatDateKey(date);

        console.log(`Looking for events on: ${dateKey}`);
        console.log(`Date object:`, date);
        console.log(`Selected date: ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
        
        console.log(`Looking for events on ${dateKey}`);
        console.log("Available events:", filteredEvents);

        const eventsForDate = filteredEvents.filter(event => {
            const eventDate = new Date(event.event_date);
            const eventDateKey = this.formatDateKey(eventDate);
            return eventDateKey === dateKey;
        });

        console.log(`Found ${eventsForDate.length} events for ${dateKey}`);

        // Convert database events to calendar format
        return eventsForDate.map(event => this.convertToCalendarEvent(event));
    }

    // FORMAT DATE KEY
    formatDateKey(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    // CONVERT TO CALENDAR EVENT
    convertToCalendarEvent(dbEvent) {
        const segments = this.parseEventSegments(dbEvent.event_segments);
        
        let calendarEvent;
        
        if (segments && segments.length > 0) {
            // Use the first segment for main event display, but keep all segments
            const firstSegment = segments[0];
            calendarEvent = {
                time: this.convertTimeFormat(firstSegment.time || '09:00'),
                endTime: this.convertTimeFormat(firstSegment.endTime || '10:00'),
                title: firstSegment.name || dbEvent.event_type,
                description: `Client: ${dbEvent.client_name} | ${dbEvent.event_type}`,
                duration: firstSegment.duration || '1 hour',
                type: this.getEventType(dbEvent.event_type),
                allSegments: segments,  // This now contains ALL segments
                clientName: dbEvent.client_name,
                venue: firstSegment.venue || dbEvent.venue || 'Venue TBD'
            };
        } else {
            calendarEvent = {
                time: '9:00 AM',
                endTime: '5:00 PM',
                title: dbEvent.event_type,
                description: `Client: ${dbEvent.client_name} | Venue: ${dbEvent.venue || 'TBD'}`,
                duration: 'All Day',
                type: this.getEventType(dbEvent.event_type),
                allSegments: [],
                clientName: dbEvent.client_name,
                venue: dbEvent.venue || 'Venue TBD'
            };
        }
        
        console.log(`Final event: ${calendarEvent.title}`);
        console.log(`Segments count: ${calendarEvent.allSegments.length}`);
        calendarEvent.allSegments.forEach((segment, index) => {
            console.log(`  Segment ${index + 1}: ${segment.time} - ${segment.endTime} - ${segment.name}`);
        });
        
        return calendarEvent;
    }

    // PARSE EVENT SEGMENTS
    parseEventSegments(segmentsText) {
        if (!segmentsText) {
            return null;
        }
        
        try {
            // Try to parse as JSON
            let parsed;
            if (typeof segmentsText === 'string') {
                parsed = JSON.parse(segmentsText);
            } else {
                parsed = segmentsText; 
            }
            
            if (Array.isArray(parsed)) {
                const segments = parsed.map((segment, index) => ({
                    name: segment.name || `Segment ${index + 1}`,
                    time: segment.time || segment.startTime || '9:00 AM',
                    endTime: segment.endTime || '10:00 AM',
                    duration: segment.duration || '1 hour',
                    venue: segment.venue || segment.notes || ''
                }));
                
                return segments;
            } else {
                return null;
            }
        } catch (e) {
            // If not JSON, try to parse as text
            return [{
                name: 'Main Event',
                time: '9:00 AM',
                endTime: '10:00 AM',
                duration: '1 hour',
                venue: segmentsText
            }];
        }
    }

    // GET EVENT TYPE
    getEventType(eventType) {
        const typeMap = {
            'wedding': 'ceremony',
            'birthday': 'reception',
            'debut': 'meeting',
        };
        return typeMap[eventType.toLowerCase()] || 'ceremony';
    }

    // RENDER EVENTS
    renderEvents(events) {
        const timeline = document.querySelector('.timeline');
        if (!timeline) return;

        // Keep the time labels column intact
        let eventLayer = timeline.querySelector('.event-layer');
        if (!eventLayer) {
            eventLayer = document.createElement('div');
            eventLayer.className = 'event-layer';
            timeline.appendChild(eventLayer);
        }
        eventLayer.innerHTML = '';

        if (events.length === 0) {
            eventLayer.innerHTML = `<div class="no-events">
            <p style="text-align:center;color:#666;padding:40px;">No events scheduled for this date.</p>
            </div>`;
            return;
        }

        const timelineStartHour = 6;   // 6:00 AM start
        const timelineEndHour = 22;    // 10:00 PM end
        const minutesPerPixel = 1;     // 1 minute = 1px (adjust for scaling)
        const hourHeight = 60 * minutesPerPixel;
        const timelineHeight = (timelineEndHour - timelineStartHour) * hourHeight;
        eventLayer.style.height = `${timelineHeight}px`;

        const minHeight = 100;

        events.forEach(event => {
            // Check if this event has multiple segments
            if (event.allSegments && event.allSegments.length > 0) {
                event.allSegments.forEach((segment, segmentIndex) => {
                    const start = this.parseTime(segment.time || '9:00 AM');
                    const end = this.parseTime(segment.endTime || '10:00 AM');

                    // Skip invalid times
                    if (isNaN(start) || isNaN(end)) return;

                    // Calculate top offset and height
                    const startOffset = (start - timelineStartHour * 60) * minutesPerPixel;
                    const calculatedHeight  = (end - start) * minutesPerPixel;
                    const eventHeight = Math.max(calculatedHeight, minHeight);

                    if (startOffset + eventHeight < 0 || startOffset > timelineHeight) return;

                    const eventDiv = document.createElement('div');
                    eventDiv.className = `event-card ${event.type}`;

                    Object.assign(eventDiv.style, {
                        position: 'absolute',
                        top: `${startOffset + (segmentIndex * 35)}px`,
                        height: `${eventHeight}px`,
                        left: '70px',
                        right: '20px',
                        background: '#FFF3CD',
                        border: '1px solid #FAD376',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        minHeight: `${minHeight}px`
                    });

                    // Use segment-specific data
                    eventDiv.innerHTML = `
                        <div class="event-title" style="font-weight:600;">${segment.name || event.title}</div>
                        <div class="event-client" style="font-size:13px;">${event.clientName}</div>
                        <div class="event-time" style="font-size:12px;color:#555;">${segment.time || event.time} - ${segment.endTime || event.endTime}</div>
                        <div class="event-venue" style="font-size:12px;">📍 ${segment.venue || event.venue || 'Venue TBD'}</div>
                        ${event.allSegments.length > 1 ? 
                            `<div class="segment-indicator" style="font-size:10px;color:#888;margin-top:4px;">
                                Segment ${segmentIndex + 1} of ${event.allSegments.length}
                            </div>` : ''
                        }
                    `;

                    eventLayer.appendChild(eventDiv);
                });
            } else {
                // Fallback: render single event (your original code)
                const start = this.parseTime(event.time);
                const end = this.parseTime(event.endTime);

                if (isNaN(start) || isNaN(end)) return;

                const startOffset = (start - timelineStartHour * 60) * minutesPerPixel;
                const eventHeight = (end - start) * minutesPerPixel;

                if (startOffset + eventHeight < 0 || startOffset > timelineHeight) return;

                const eventDiv = document.createElement('div');
                eventDiv.className = `event-card ${event.type}`;

                Object.assign(eventDiv.style, {
                    position: 'absolute',
                    top: `${startOffset}px`,
                    height: `${eventHeight}px`,
                    left: '70px',
                    right: '20px',
                    background: '#ffcdcdff',
                    border: '1px solid #FAD376',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(167, 51, 51, 0.1)'
                });

                eventDiv.innerHTML = `
                    <div class="event-title" style="font-weight:600;">${event.title}</div>
                    <div class="event-client" style="font-size:13px;">${event.clientName}</div>
                    <div class="event-time" style="font-size:12px;color:#555;">${event.time} - ${event.endTime}</div>
                    <div class="event-venue" style="font-size:12px;">📍 ${event.venue || 'Venue TBD'}</div>
                `;

                eventLayer.appendChild(eventDiv);
            }
        });
    }

    // GET ALL POSSIBLE TIME SLOTS
    generateAllTimeSlots(events) {
    console.log("Generating dynamic time slots from events:", events);
    
    if (events.length === 0) {
        console.log("📭 No events to generate time slots from");
        return [];
    }

    // Extract all unique times from events
    const allTimes = new Set();
    
    events.forEach(event => {
        // Add the event's start time
        if (event.time) {
            allTimes.add(event.time);
        }
        
        // Add the event's end time if available
        if (event.endTime) {
            allTimes.add(event.endTime);
        }
        
        // Add times from all segments
        if (event.allSegments && event.allSegments.length > 0) {
            event.allSegments.forEach(segment => {
                if (segment.time) allTimes.add(segment.time);
                if (segment.endTime) allTimes.add(segment.endTime);
            });
        }
    });

    console.log("⏰ Unique times found:", Array.from(allTimes));

    // Convert to array and sort chronologically
    const sortedTimes = Array.from(allTimes).sort((a, b) => {
        return this.parseTime(a) - this.parseTime(b);
    });

    // Fill in gaps with standard time slots if needed
    const filledTimes = this.fillTimeGaps(sortedTimes);
    
    // Create time slots
    return filledTimes.map(time => {
        const eventsAtThisTime = events.filter(event => 
            this.isTimeAtSlot(event, time) || 
            this.isTimeOverlapping(event, time)
        );

            return {
                time: time,
                events: eventsAtThisTime.length > 0 ? eventsAtThisTime : null
            };
        });
    }

    fillTimeGaps(times) {
        if (times.length === 0) {
            return [
                '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
            ];
        }

        const standardSlots = [
            '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
            '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM, 9:00 PM, 10:00 PM'
        ];

        const allTimes = [...new Set([...times, ...standardSlots])].sort((a, b) => {
            return this.parseTime(a) - this.parseTime(b);
        });

        return allTimes;
    }

    isTimeAtSlot(event, slotTime) {
        const matches = event.time === slotTime;
        if (matches) {
            console.log(`🎯 ${event.client_name} starts at ${slotTime}`);
        }
        return matches;
    }

    //  IS TIME OVERLAPPING
    isTimeOverlapping(event, slotTime) {
        // Check if event overlaps with this time slot
        const eventStart = this.parseTime(event.time);
        const eventEnd = this.parseTime(event.endTime);
        const slot = this.parseTime(slotTime);
        
        const overlaps = slot >= eventStart && slot <= eventEnd;
        if (overlaps && event.time !== slotTime) {
            console.log(`🔄 ${event.client_name} overlaps with ${slotTime} (${event.time} - ${event.endTime})`);
        }
        return overlaps;
    }

    convertTimeFormat(time24) {
    if (!time24) return '9:00 AM';
    
    // If already in 12-hour format, return as is
    if (time24.includes('AM') || time24.includes('PM')) {
        return time24;
    }
    
    // Convert "08:30" to "8:30 AM"
    try {
            const [hours, minutes] = time24.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12;
            return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        } catch (e) {
            console.warn(`⚠️ Could not convert time: ${time24}`, e);
            return '9:00 AM';
        }
    }

    // PARSE TIMER
    parseTime(timeStr) {
        // Convert "9:00 AM" to comparable format
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
    }

    // CREATE HTML
    createEventHTML(event) {
        return `
            <div class="event-title">${event.title}</div>
            <div class="event-client">${event.clientName}</div>
            <div class="event-description">${event.description}</div>
            <div class="event-venue">📍Venue: ${event.venue || event.allSegments?.[0]?.venue || 'Venue TBD'}</div>
            <div class="event-duration">
                <span class="duration-time">${event.time} - ${event.endTime}</span>
                <span class="duration-length">${event.duration}</span>
            </div>
            ${event.allSegments && event.allSegments.length > 1 ? 
                `<div class="event-segments-count">+${event.allSegments.length - 1} more segments</div>` : ''
            }
        `;
    }

    // CREATE OVERLAPPING HTML
    createOverlappingEventsHTML(events) {
        return `
            <div class="event-title">Multiple Events</div>
            <div class="overlapping-events-list">
                ${events.map(event => `
                    <div class="overlapping-event-item ${event.type}">
                        <span class="event-client">${event.clientName}</span>
                        <span class="event-time">${event.time}</span>
                    </div>
                `).join('')}
            </div>
            <div class="event-duration">
                <span class="duration-time">Time Slot Conflict</span>
            </div>
        `;
    }
}
// END OF FUNCTIONAL CALENDAR


// ======= THIS IS OLD CODE ========
// Your initializeCalendar function (keep as is)
function initializeCalendar() {
    console.log("Attempting to initialize calendar...");

    const scheduleContent = document.querySelector('.schedule-content');

    if (!scheduleContent) {
        console.log("Schedule content not loaded yet");
        return false;
    }

    const calendarGrid = scheduleContent.querySelector('.calendar-grid');
    const timeline = scheduleContent.querySelector('.timeline');
    const dateTitle = scheduleContent.querySelector('.date-title');
    const monthNav = scheduleContent.querySelector('.month-nav');
    
    console.log("Calendar grid in section:", !!calendarGrid);
    console.log("Timeline in section:", !!timeline);
    console.log("Date title in section:", !!dateTitle);
    console.log("Month nav in section:", !!monthNav);
    
    if (calendarGrid && timeline && dateTitle && monthNav) {
        console.log("All required elements found - initializing calendar");
        new FunctionalCalendar();
        return true;
    } else {
        console.log("Some elements still not found in schedule section");
        return false;
    }
}

// The observer that watches for schedule content
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // Check if schedule content was added
            const scheduleContent = document.querySelector('.schedule-content');
            if (scheduleContent && !window.calendarInitialized) {
                console.log("Schedule content detected by observer - initializing calendar");
                if (initializeCalendar()) {
                    window.calendarInitialized = true;
                    observer.disconnect(); // Stop watching once initialized
                }
            }
        }
    });
});

// Start watching when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - checking for schedule content");
    
    // Try immediate initialization (in case schedule is already there)
    if (initializeCalendar()) {
        window.calendarInitialized = true;
        console.log("Calendar initialized immediately");
    } else {
        // If not ready, start watching for DOM changes
        console.log("Starting MutationObserver to watch for schedule content");
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
});

// Global function for manual triggering (backup method)
window.initializeScheduleCalendar = function() {
    console.log("Manual calendar initialization called");
    if (!window.calendarInitialized) {
        if (initializeCalendar()) {
            window.calendarInitialized = true;
            return true;
        }
    }
    return false;
};

function toggleClientDropdown() {
    const menu = document.getElementById('dropdownMenu');
    if (!menu) return;

    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('dropdownMenu');
    const trigger = document.querySelector('.dropdown-selected');
    if (menu && !e.target.closest('.client-filter-select')) {
        menu.style.display = 'none';
    }
});