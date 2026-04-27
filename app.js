const queries = [];
const activity = [];
const chatHistory = [];
let currentRole = 'Mentee';
let activeQueryId = null;
let selectedSlot = null;
let pendingCloseQueryId = null;

const queryBoard = document.getElementById('queryBoard');
const activityLog = document.getElementById('activityLog');
const currentRoleLabel = document.getElementById('currentRoleLabel');

const totalQuestions = document.getElementById('totalQuestions');
const totalBooked = document.getElementById('totalBooked');
const totalResolved = document.getElementById('totalResolved');
const totalUpdates = document.getElementById('totalUpdates');
const openCount = document.getElementById('openCount');
const bookedCount = document.getElementById('bookedCount');
const totalQuestionsMini = document.getElementById('totalQuestionsMini');
const totalBookedMini = document.getElementById('totalBookedMini');
const totalConfirmedMini = document.getElementById('totalConfirmedMini');
const totalResolvedMini = document.getElementById('totalResolvedMini');
const kpiUrgent = document.getElementById('kpiUrgent');
const kpiResponse = document.getElementById('kpiResponse');

const modal = document.getElementById('slotModal');
const modalQueryText = document.getElementById('modalQueryText');
const modalQueryDetails = document.getElementById('modalQueryDetails');
const modalLinkText = document.getElementById('modalLinkText');
const modalMeetingType = document.getElementById('modalMeetingType');
const adminEditFields = document.getElementById('adminEditFields');
const adminQueryTitle = document.getElementById('adminQueryTitle');
const adminQueryCategory = document.getElementById('adminQueryCategory');
const adminQueryDescription = document.getElementById('adminQueryDescription');
const adminQueryComplexity = document.getElementById('adminQueryComplexity');
const adminQueryMentor = document.getElementById('adminQueryMentor');
const adminQueryStatus = document.getElementById('adminQueryStatus');
const resolutionSummary = document.getElementById('resolutionSummary');
const adminSaveButton = document.getElementById('adminSaveButton');
const modalCloseButton = document.getElementById('modalCloseButton');
const resolutionFields = document.getElementById('resolutionFields');
const selectedSlotText = document.getElementById('selectedSlotText');
const summaryPanel = document.getElementById('summaryPanel');

const chatPanel = document.getElementById('chatPanel');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSender = document.getElementById('chatSender');

const ctx = document.getElementById('complexityChart').getContext('2d');
const complexityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
            data: [0, 0, 0],
            backgroundColor: ['#22c55e', '#fbbf24', '#fb7185']
        }]
    },
    options: {
        plugins: {
            legend: { position: 'bottom' }
        }
    }
});

function setRole(role) {
    currentRole = role;
    currentRoleLabel.textContent = role;
    document.getElementById('queryForm').style.display = role === 'Mentee' ? 'block' : 'none';
    document.querySelectorAll('.roleButton').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });
    renderDashboard();
}

function postQuery() {
    const title = document.getElementById('queryTitle').value.trim();
    const description = document.getElementById('queryDescription').value.trim();
    const category = document.getElementById('queryCategory').value;
    const complexity = document.getElementById('queryComplexity').value;
    const preferredMentor = document.getElementById('queryMentor').value;
    const meetingType = document.getElementById('queryMeetingType').value;

    if (!title || !description) {
        alert('Please complete the question title and details.');
        return;
    }

    const newQuery = {
        id: Date.now(),
        title,
        description,
        category,
        complexity,
        preferredMentor,
        meetingType,
        teamsLink: null,
        status: 'Open',
        slot: null,
        mentor: null,
        mentorConfirmed: false,
        menteeConfirmed: false,
        summary: '',
        created: new Date()
    };
    queries.unshift(newQuery);
    addActivity(`Mentee posted a new ${complexity} priority query.`);
    resetForm();
    renderDashboard();
}

function resetForm() {
    document.getElementById('queryTitle').value = '';
    document.getElementById('queryDescription').value = '';
    document.getElementById('queryComplexity').value = 'High';
    document.getElementById('queryCategory').value = 'Cloud Architecture';
    document.getElementById('queryMeetingType').value = 'Teams video';
    document.getElementById('queryMentor').value = 'Any available mentor';
}

function renderDashboard() {
    renderQueries();
    renderMetrics();
    renderActivity();
    renderSummarySection();
    updateCharts();
}

function renderQueries() {
    const openQueries = currentRole === 'Admin' ? queries : queries.filter(q => q.status !== 'Resolved');
    openCount.textContent = `${queries.filter(q => q.status === 'Open').length} open`;
    bookedCount.textContent = `${queries.filter(q => q.status === 'Booked').length} booked`;
    queryBoard.innerHTML = openQueries.length ? openQueries.map(renderQueryCard).join('') : '<div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">No active queries yet. Once a mentee posts a question it appears here.</div>';
}

function renderQueryCard(query) {
    const statusBadgeStyle = query.status === 'Open'
        ? 'badge-pill bg-slate-800 text-slate-200'
        : query.status === 'Selected'
        ? 'badge-pill bg-amber-500 text-slate-950'
        : query.status === 'Booked'
        ? 'badge-pill bg-emerald-500 text-slate-950'
        : query.status === 'Confirmed'
        ? 'badge-pill bg-cyan-500 text-slate-950'
        : 'badge-pill bg-slate-800 text-slate-200';

    let actionButton = '';
    const actionButtonClass = 'rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 shadow-sm transition hover:bg-slate-900';
    const primaryButtonClass = 'rounded-full bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500';

    if (currentRole === 'Mentor' && query.status === 'Open') {
        actionButton = `<button onclick="beginBooking(${query.id})" class="${primaryButtonClass}">Take & Book</button>`;
    } else if (currentRole === 'Mentor' && (query.status === 'Selected' || query.status === 'Booked' || query.status === 'Confirmed')) {
        actionButton = `<div class="compact-action-group">
            <button onclick="openBookingModal(${query.id})" class="${actionButtonClass}">Assign / Update</button>
            ${query.status !== 'Resolved' ? `<button onclick="requestCloseQuery(${query.id})" class="${primaryButtonClass}">Close</button>` : ''}
        </div>`;
    } else if (currentRole === 'Mentee' && query.status === 'Booked' && !query.menteeConfirmed) {
        actionButton = `<button onclick="confirmAttendance(${query.id})" class="${primaryButtonClass}">Confirm</button>`;
    } else if (currentRole === 'Admin') {
        actionButton = `<div class="compact-action-group">
            <button onclick="openBookingModal(${query.id})" class="${actionButtonClass}">Edit</button>
            ${query.status !== 'Resolved' ? `<button onclick="closeQuery(${query.id})" class="${primaryButtonClass}">Close</button>` : ''}
        </div>`;
    } else if (query.status === 'Confirmed') {
        actionButton = `<div class="badge-pill bg-cyan-500 text-slate-950">Awaiting admin</div>`;
    } else if (query.status === 'Selected') {
        actionButton = `<div class="badge-pill bg-amber-500 text-slate-950">Mentor selecting</div>`;
    }

    const confirmationFlags = `
        <span class="flag-pill ${query.mentorConfirmed ? 'flag-positive' : ''}">Mentor ${query.mentorConfirmed ? '✔' : 'Pending'}</span>
        <span class="flag-pill ${query.menteeConfirmed ? 'flag-positive' : ''}">Mentee ${query.menteeConfirmed ? '✔' : 'Pending'}</span>
    `;

    return `
        <div class="compact-card">
            <div class="compact-card-top">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-[11px] uppercase tracking-[0.3em] text-slate-400">${query.category}</p>
                        <h4 class="mt-1 text-base font-semibold text-slate-100 truncate">${query.title}</h4>
                    </div>
                    <span class="${statusBadgeStyle}">${query.status}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <span class="badge-pill ${query.complexity === 'High' ? 'badge-high' : query.complexity === 'Medium' ? 'badge-medium' : 'badge-low'}">${query.complexity}</span>
                    <span class="badge-pill bg-slate-800 text-slate-200">${query.meetingType}</span>
                    <span class="badge-pill bg-slate-800 text-slate-200">${query.preferredMentor}</span>
                </div>
                <p class="compact-description">${query.description}</p>
                <div class="flex flex-wrap gap-2 text-[11px]">
                    ${confirmationFlags}
                    ${query.slot ? `<span class="flag-pill">Slot: ${query.slot}</span>` : ''}
                    ${query.teamsLink ? `<a href="${query.teamsLink}" target="_blank" class="flag-pill flag-link">Teams</a>` : ''}
                </div>
            </div>
            <div class="compact-card-actions">${actionButton}</div>
        </div>
    `;
}

function beginBooking(id) {
    const query = queries.find(q => q.id === id);
    query.status = 'Selected';
    query.mentor = query.preferredMentor === 'Any available mentor' ? 'Mentor A' : query.preferredMentor;
    query.mentorConfirmed = false;
    query.menteeConfirmed = false;
    addActivity(`${query.mentor} selected query: "${query.title}".`);
    openBookingModal(id);
    renderDashboard();
}

function openBookingModal(id, options = {}) {
    activeQueryId = id;
    pendingCloseQueryId = options.pendingClose ? id : null;
    const query = queries.find(q => q.id === id);
    selectedSlot = query.slot || null;
    modalQueryText.textContent = query.title;
    modalQueryDetails.textContent = `${query.category} • ${query.complexity} complexity`;
    modalMeetingType.value = query.meetingType || 'Teams video';
    selectedSlotText.textContent = selectedSlot || 'None';
    modalLinkText.textContent = query.teamsLink ? query.teamsLink : 'Generate a Teams link after slot selection.';
    adminEditFields.classList.toggle('hidden', currentRole !== 'Admin');
    adminSaveButton.classList.toggle('hidden', currentRole !== 'Admin');
    const showResolution = currentRole !== 'Mentee' && query.status !== 'Resolved';
    resolutionFields.classList.toggle('hidden', !showResolution);
    modalCloseButton.classList.toggle('hidden', !showResolution);
    resolutionSummary.value = query.summary || '';
    if (currentRole === 'Admin') {
        adminQueryTitle.value = query.title;
        adminQueryCategory.value = query.category;
        adminQueryDescription.value = query.description;
        adminQueryComplexity.value = query.complexity;
        adminQueryMentor.value = query.preferredMentor;
        adminQueryStatus.value = query.status;
    }
    modal.classList.remove('hidden');
    document.querySelectorAll('.slotOption').forEach(btn => {
        const selected = btn.dataset.slot === selectedSlot;
        btn.classList.toggle('border-sky-400', selected);
        btn.classList.toggle('selected', selected);
    });
}

function closeModal() {
    modal.classList.add('hidden');
    selectedSlot = null;
    selectedSlotText.textContent = 'None';
    activeQueryId = null;
    pendingCloseQueryId = null;
    resolutionSummary.value = '';
    if (resolutionFields) resolutionFields.classList.add('hidden');
    if (modalCloseButton) modalCloseButton.classList.add('hidden');
    if (adminSaveButton) adminSaveButton.classList.add('hidden');
}

document.querySelectorAll('.slotOption').forEach(button => {
    button.addEventListener('click', () => {
        selectedSlot = button.dataset.slot;
        selectedSlotText.textContent = selectedSlot;
        document.querySelectorAll('.slotOption').forEach(btn => {
            btn.classList.remove('border-sky-400');
            btn.classList.remove('selected');
        });
        button.classList.add('border-sky-400');
        button.classList.add('selected');
    });
});

function confirmSlot() {
    if (!activeQueryId || !selectedSlot) {
        alert('Please choose a slot before confirming.');
        return;
    }
    const query = queries.find(q => q.id === activeQueryId);
    query.meetingType = modalMeetingType.value;
    if (currentRole === 'Mentor') {
        query.slot = selectedSlot;
        query.status = 'Booked';
        query.mentorConfirmed = true;
        addActivity(`Mentor confirmed slot ${selectedSlot} for "${query.title}".`);
        if (query.meetingType === 'Teams video') {
            generateTeamsLink(true);
        }
    } else if (currentRole === 'Mentee') {
        if (!query.slot) {
            alert('Mentor must assign a slot before the mentee confirms it.');
            return;
        }
        query.menteeConfirmed = true;
        if (query.mentorConfirmed) {
            query.status = 'Confirmed';
            addActivity(`Mentee confirmed attendance for "${query.title}".`);
        } else {
            addActivity(`Mentee acknowledged slot ${selectedSlot} for "${query.title}".`);
        }
    } else if (currentRole === 'Admin') {
        query.slot = selectedSlot;
        query.status = query.status === 'Open' ? 'Booked' : query.status;
        query.mentorConfirmed = true;
        query.menteeConfirmed = true;
        addActivity(`Admin updated slot ${selectedSlot} for "${query.title}".`);
        if (query.meetingType === 'Teams video') {
            generateTeamsLink(true);
        }
        saveAdminChanges();
    }
    closeModal();
    renderDashboard();
}

function handleModalClose() {
    const id = pendingCloseQueryId || activeQueryId;
    if (!id) return;
    const query = queries.find(q => q.id === id);
    const summaryText = resolutionSummary.value.trim();
    if (!summaryText) {
        alert('A resolution summary is required before closing the query.');
        return;
    }
    query.summary = summaryText;
    query.status = 'Resolved';
    addActivity(`${currentRole} closed query "${query.title}" with a resolution summary.`);
    closeModal();
    renderDashboard();
}

function saveAdminChanges() {
    if (!activeQueryId || currentRole !== 'Admin') return;
    const query = queries.find(q => q.id === activeQueryId);
    query.title = adminQueryTitle.value.trim() || query.title;
    query.description = adminQueryDescription.value.trim() || query.description;
    query.category = adminQueryCategory.value;
    query.complexity = adminQueryComplexity.value;
    query.preferredMentor = adminQueryMentor.value;
    query.status = adminQueryStatus.value;
    const summaryText = resolutionSummary.value.trim();
    if (query.status === 'Resolved' && !summaryText) {
        alert('A resolution summary is required before closing a query.');
        return;
    }
    query.summary = summaryText;
    if (query.status === 'Resolved') {
        addActivity(`Admin closed query "${query.title}" via edit modal.`);
    } else {
        addActivity(`Admin edited query "${query.title}".`);
    }
    renderDashboard();
}

function generateTeamsLink(fromConfirm = false) {
    if (!activeQueryId) {
        alert('Open a query first to generate a Teams link.');
        return;
    }
    const query = queries.find(q => q.id === activeQueryId);
    query.teamsLink = `https://teams.microsoft.com/l/meetup-join/${query.id}-${Date.now()}`;
    modalLinkText.textContent = query.teamsLink;
    if (!fromConfirm) {
        addActivity(`Teams meeting link generated for "${query.title}".`);
    }
    renderDashboard();
}

function confirmAttendance(id) {
    const query = queries.find(q => q.id === id);
    if (!query.slot) {
        alert('No slot is assigned yet.');
        return;
    }
    query.menteeConfirmed = true;
    if (query.mentorConfirmed) {
        query.status = 'Confirmed';
        addActivity(`Mentee confirmed attendance for "${query.title}".`);
    } else {
        addActivity(`Mentee acknowledged the assigned slot for "${query.title}".`);
    }
    renderDashboard();
}

function requestCloseQuery(id) {
    const query = queries.find(q => q.id === id);
    if (!query.summary.trim()) {
        openBookingModal(id, { pendingClose: true });
        return;
    }
    query.status = 'Resolved';
    addActivity(`${currentRole} closed query "${query.title}" with existing resolution summary.`);
    renderDashboard();
}

function closeQuery(id) {
    requestCloseQuery(id);
}

function toggleChat() {
    chatPanel.classList.toggle('hidden');
    if (!chatPanel.classList.contains('hidden')) {
        renderChat();
    }
}

function sendChatMessage() {
    const message = chatInput.value.trim();
    const sender = chatSender.value;
    if (!message) return;
    chatHistory.push({ sender, message, time: new Date() });
    if (chatHistory.length > 50) chatHistory.shift();
    chatInput.value = '';
    renderChat();
    addActivity(`${sender} sent a private chat message.`);
}

function renderChat() {
    chatMessages.innerHTML = chatHistory.length ? chatHistory.map(msg => `
        <div class="rounded-3xl p-3 ${msg.sender === 'Admin' ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-800'}">
            <div class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                <span>${msg.sender}</span>
                <span>${msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p class="mt-2 text-sm leading-6">${msg.message}</p>
        </div>
    `).join('') : '<p class="text-sm text-slate-500">No chat messages yet. Start the conversation with your mentor or admin.</p>';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderActivity() {
    activityLog.innerHTML = activity.length ? activity.map(item => `
        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center gap-3">
                <span class="timeline-dot bg-sky-500"></span>
                <p class="text-sm font-semibold text-slate-900">${item.message}</p>
            </div>
            <p class="mt-2 text-xs text-slate-500">${item.time.toLocaleString()}</p>
        </div>
    `).join('') : '<p class="text-sm text-slate-500">No activity tracked yet. All actions will appear here.</p>';
}

function renderSummarySection() {
    const closedQueries = queries.filter(q => q.status === 'Resolved');
    summaryPanel.innerHTML = closedQueries.length ? closedQueries.map(query => `
        <div class="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${query.category}</p>
                    <h4 class="mt-2 text-lg font-semibold text-white">${query.title}</h4>
                </div>
                <span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">${query.status}</span>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-300">${query.description}</p>
            <div class="mt-4 rounded-3xl bg-slate-900 p-4 text-sm text-slate-200">
                <p class="text-sm font-semibold text-slate-100">Solution summary</p>
                <p class="mt-2 leading-6">${query.summary || 'No summary added yet. Admin can update the summary when closing the query.'}</p>
            </div>
        </div>
    `).join('') : '<div class="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-300">No summaries available yet. Admin summaries appear here after query closure.</div>';
}

function renderMetrics() {
    const open = queries.filter(q => q.status === 'Open').length;
    const selected = queries.filter(q => q.status === 'Selected').length;
    const booked = queries.filter(q => q.status === 'Booked').length;
    const confirmed = queries.filter(q => q.status === 'Confirmed').length;
    const resolved = queries.filter(q => q.status === 'Resolved').length;
    const urgent = queries.filter(q => q.complexity === 'High' && q.status !== 'Resolved').length;
    const responseRate = queries.length ? Math.round(((selected + booked + confirmed) / queries.length) * 100) : 0;

    totalQuestions.textContent = queries.length;
    totalBooked.textContent = booked;
    totalResolved.textContent = resolved;
    totalUpdates.textContent = activity.length;
    totalQuestionsMini.textContent = queries.length;
    totalBookedMini.textContent = booked;
    totalConfirmedMini.textContent = confirmed;
    totalResolvedMini.textContent = resolved;
    kpiUrgent.textContent = urgent;
    kpiResponse.textContent = `${responseRate}%`;
}

function updateCharts() {
    const counts = [
        queries.filter(q => q.complexity === 'Low').length,
        queries.filter(q => q.complexity === 'Medium').length,
        queries.filter(q => q.complexity === 'High').length
    ];
    complexityChart.data.datasets[0].data = counts;
    complexityChart.update();
}

function addActivity(message) {
    activity.unshift({
        message,
        time: new Date()
    });
    if (activity.length > 10) activity.pop();
}

function seedSampleData() {
    const sample = [
        { title: 'Design scalable microservices', description: 'Need best practices for API gateway and service separation in AWS.', category: 'Cloud Architecture', complexity: 'High', preferredMentor: 'Mentor A' },
        { title: 'Debugging data pipeline latency', description: 'Why are my ETL jobs slowing down on larger datasets?', category: 'Data Engineering', complexity: 'Medium', preferredMentor: 'Any available mentor' },
        { title: 'React form validation', description: 'How to implement reusable validation for multiple complex forms?', category: 'Web Development', complexity: 'Low', preferredMentor: 'Mentor B' }
    ];

    sample.forEach(item => {
        queries.push({
            ...item,
            id: Date.now() + Math.random(),
            meetingType: 'Teams video',
            teamsLink: null,
            status: 'Open',
            slot: null,
            mentor: null,
            mentorConfirmed: false,
            menteeConfirmed: false,
            summary: '',
            created: new Date()
        });
    });
    renderDashboard();
}

setRole('Mentee');
seedSampleData();
