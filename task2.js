const initialShipmentTasks = [
  { id: 101, title: "Customs Clearance - Almaty Express Hub", priority: "high", tag: "Customs", column: "todo", estimateHours: 4, isCompleted: false },
  { id: 102, title: "Refrigerated Container 40ft Temp Calibration", priority: "high", tag: "Transit", column: "todo", estimateHours: 3, isCompleted: false },
  { id: 103, title: "Autonomous Drone Fleet Pre-flight Diagnostics", priority: "medium", tag: "Aviation", column: "todo", estimateHours: 5, isCompleted: false },
  { id: 104, title: "Astana Central Railway Cargo Loading (Car 08)", priority: "high", tag: "Transit", column: "in-progress", estimateHours: 6, isCompleted: false },
  { id: 105, title: "Automated Warehouse Pallet Sorting (Rack B-14)", priority: "low", tag: "Warehousing", column: "in-progress", estimateHours: 2, isCompleted: false },
  { id: 106, title: "EV Transport Fleet Fast-Charging Cycle #3", priority: "medium", tag: "Fleet", column: "in-progress", estimateHours: 3, isCompleted: false },
  { id: 107, title: "Cross-Border Transit Manifest Certification", priority: "high", tag: "Customs", column: "done", estimateHours: 5, isCompleted: true },
  { id: 108, title: "Cold-Chain Vaccine Shipment Delivery (Aktau)", priority: "high", tag: "Transit", column: "done", estimateHours: 8, isCompleted: true },
  { id: 109, title: "Heavy Freight Vehicle Brake & Sensor Inspection", priority: "medium", tag: "Fleet", column: "todo", estimateHours: 4, isCompleted: false },
  { id: 110, title: "Smart GPS Tracking Sensor Battery Replacements", priority: "low", tag: "Fleet", column: "todo", estimateHours: 2, isCompleted: false },
  { id: 111, title: "Aviation Air-Cargo Pallet Securing (Boeing 777F)", priority: "high", tag: "Aviation", column: "todo", estimateHours: 4, isCompleted: false },
  { id: 112, title: "Central Warehouse Inventory Cycle Count Q4", priority: "medium", tag: "Warehousing", column: "done", estimateHours: 3, isCompleted: true }
];

let shipmentTasks = initialShipmentTasks.map(item => ({ ...item }));

let searchQuery = "";
let selectedCategory = "all";
let sortBy = "none";

const MAX_IN_PROGRESS_LIMIT = 3;

const kanbanAppContainer = document.getElementById("kanban-app");
const searchInput = document.getElementById("kanban-search");
const tagFilterSelect = document.getElementById("kanban-tag-filter");
const sortSelect = document.getElementById("kanban-sort");
const ruleAlertBox = document.getElementById("kanban-rule-alert");
const statsSummaryText = document.getElementById("kanban-stats-summary");
const progressFillBar = document.getElementById("kanban-progress-fill");

const todoColumnList = document.getElementById("column-todo-list");
const progressColumnList = document.getElementById("column-progress-list");
const doneColumnList = document.getElementById("column-done-list");

const todoCountBadge = document.getElementById("count-todo");
const progressCountBadge = document.getElementById("count-progress");
const doneCountBadge = document.getElementById("count-done");

function calculateDispatchStats(items) {
  let totalCount = 0;
  let completedCount = 0;
  let totalHours = 0;
  let completedHours = 0;

  for (const shipment of items) {
    totalCount += 1;
    totalHours += shipment.estimateHours;

    if (shipment.column === "done") {
      completedCount += 1;
      completedHours += shipment.estimateHours;
    }
  }

  const completionPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    totalCount,
    completedCount,
    totalHours,
    completedHours,
    completionPercent
  };
}

function getColumnItemCount(columnName) {
  let count = 0;
  for (const item of shipmentTasks) {
    if (item.column === columnName) {
      count += 1;
    }
  }
  return count;
}

function emptyContainerNodes(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function buildShipmentCardNode(task) {
  const card = document.createElement("article");
  card.classList.add("dispatch-task-card");
  card.dataset.id = String(task.id);

  const titleRow = document.createElement("div");
  titleRow.classList.add("card-title-row");

  const titleEl = document.createElement("h4");
  titleEl.classList.add("dispatch-card-title");
  titleEl.textContent = task.title;

  const priorityTag = document.createElement("span");
  priorityTag.classList.add("priority-tag", `priority-${task.priority}`);
  priorityTag.textContent = task.priority;

  titleRow.appendChild(titleEl);
  titleRow.appendChild(priorityTag);
  card.appendChild(titleRow);

  const infoRow = document.createElement("div");
  infoRow.classList.add("card-info-row");

  const tagChip = document.createElement("span");
  tagChip.classList.add("category-tag-chip");
  tagChip.textContent = `🏷️ ${task.tag}`;

  const hoursEl = document.createElement("span");
  hoursEl.textContent = `⏱️ ${task.estimateHours}h`;

  infoRow.appendChild(tagChip);
  infoRow.appendChild(hoursEl);
  card.appendChild(infoRow);

  const btnRow = document.createElement("div");
  btnRow.classList.add("card-btn-controls");

  if (task.column !== "todo") {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.classList.add("btn-card-action");
    prevBtn.dataset.action = "move-prev";
    prevBtn.dataset.id = String(task.id);
    prevBtn.textContent = task.column === "done" ? "← In Progress" : "← To Do";
    prevBtn.setAttribute("aria-label", `Move ${task.title} backward`);
    btnRow.appendChild(prevBtn);
  }

  if (task.column !== "done") {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.classList.add("btn-card-action");
    nextBtn.dataset.action = "move-next";
    nextBtn.dataset.id = String(task.id);
    nextBtn.textContent = task.column === "todo" ? "In Progress →" : "Deliver (Done) →";
    nextBtn.setAttribute("aria-label", `Move ${task.title} forward`);
    btnRow.appendChild(nextBtn);
  }

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.classList.add("btn-card-action");
  delBtn.dataset.action = "delete";
  delBtn.dataset.id = String(task.id);
  delBtn.textContent = "✕";
  delBtn.setAttribute("aria-label", `Delete shipment ${task.title}`);
  btnRow.appendChild(delBtn);

  card.appendChild(btnRow);
  return card;
}

function renderKanban() {
  if (!todoColumnList || !progressColumnList || !doneColumnList) return;

  let visibleTasks = shipmentTasks.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.tag.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (sortBy === "priority") {
    const weight = { high: 3, medium: 2, low: 1 };
    visibleTasks.sort((a, b) => weight[b.priority] - weight[a.priority]);
  } else if (sortBy === "hours") {
    visibleTasks.sort((a, b) => b.estimateHours - a.estimateHours);
  } else if (sortBy === "title") {
    visibleTasks.sort((a, b) => a.title.localeCompare(b.title));
  }

  emptyContainerNodes(todoColumnList);
  emptyContainerNodes(progressColumnList);
  emptyContainerNodes(doneColumnList);

  let todoCount = 0;
  let progressCount = 0;
  let doneCount = 0;

  for (const task of visibleTasks) {
    const cardEl = buildShipmentCardNode(task);
    if (task.column === "todo") {
      todoColumnList.appendChild(cardEl);
      todoCount += 1;
    } else if (task.column === "in-progress") {
      progressColumnList.appendChild(cardEl);
      progressCount += 1;
    } else if (task.column === "done") {
      doneColumnList.appendChild(cardEl);
      doneCount += 1;
    }
  }

  if (visibleTasks.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.classList.add("empty-state-notice");
    emptyNotice.textContent = "No logistics tasks found matching your search or category filter.";
    todoColumnList.appendChild(emptyNotice);
  } else {
    if (todoCount === 0) {
      const msg = document.createElement("div");
      msg.classList.add("empty-state-notice");
      msg.textContent = "To Do queue is currently clear.";
      todoColumnList.appendChild(msg);
    }
    if (progressCount === 0) {
      const msg = document.createElement("div");
      msg.classList.add("empty-state-notice");
      msg.textContent = "No active deliveries in progress.";
      progressColumnList.appendChild(msg);
    }
    if (doneCount === 0) {
      const msg = document.createElement("div");
      msg.classList.add("empty-state-notice");
      msg.textContent = "No shipments completed yet.";
      doneColumnList.appendChild(msg);
    }
  }

  todoCountBadge.textContent = String(getColumnItemCount("todo"));
  progressCountBadge.textContent = `${getColumnItemCount("in-progress")}/${MAX_IN_PROGRESS_LIMIT}`;
  doneCountBadge.textContent = String(getColumnItemCount("done"));

  const stats = calculateDispatchStats(shipmentTasks);
  statsSummaryText.textContent = `Completed ${stats.completedCount} of ${stats.totalCount} shipments (${stats.completionPercent}%) • ${stats.completedHours}/${stats.totalHours} operational hours delivered`;
  progressFillBar.style.width = `${stats.completionPercent}%`;
}

function moveShipmentNext(taskId) {
  const task = shipmentTasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.column === "todo") {
    const currentInProgress = getColumnItemCount("in-progress");
    if (currentInProgress >= MAX_IN_PROGRESS_LIMIT) {
      showRuleAlert(`⚠️ Dispatch Rule Blocked: 'In Progress' queue has reached its maximum safety limit of ${MAX_IN_PROGRESS_LIMIT} shipments. Complete an existing transit before launching another!`);
      return;
    }
    hideRuleAlert();
    task.column = "in-progress";
    task.isCompleted = false;
  } else if (task.column === "in-progress") {
    hideRuleAlert();
    task.column = "done";
    task.isCompleted = true;
  }

  renderKanban();
}

function moveShipmentPrev(taskId) {
  const task = shipmentTasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.column === "done") {
    const currentInProgress = getColumnItemCount("in-progress");
    if (currentInProgress >= MAX_IN_PROGRESS_LIMIT) {
      showRuleAlert(`⚠️ Action Blocked: Cannot return shipment to 'In Progress'. Safety capacity of ${MAX_IN_PROGRESS_LIMIT} shipments is full!`);
      return;
    }
    hideRuleAlert();
    task.column = "in-progress";
    task.isCompleted = false;
  } else if (task.column === "in-progress") {
    hideRuleAlert();
    task.column = "todo";
    task.isCompleted = false;
  }

  renderKanban();
}

function deleteShipment(taskId) {
  shipmentTasks = shipmentTasks.filter(t => t.id !== taskId);
  hideRuleAlert();
  renderKanban();
}

function showRuleAlert(text) {
  ruleAlertBox.textContent = text;
  ruleAlertBox.classList.add("active");
}

function hideRuleAlert() {
  ruleAlertBox.textContent = "";
  ruleAlertBox.classList.remove("active");
}

function handleContainerActionClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const taskId = parseInt(button.dataset.id, 10);

  if (action === "move-next") {
    moveShipmentNext(taskId);
  } else if (action === "move-prev") {
    moveShipmentPrev(taskId);
  } else if (action === "delete") {
    deleteShipment(taskId);
  }
}

function initTask2() {
  if (!kanbanAppContainer || !searchInput || !tagFilterSelect || !sortSelect) return;

  kanbanAppContainer.addEventListener("click", handleContainerActionClick);

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderKanban();
  });

  tagFilterSelect.addEventListener("change", (e) => {
    selectedCategory = e.target.value;
    renderKanban();
  });

  sortSelect.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderKanban();
  });

  renderKanban();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTask2);
} else {
  initTask2();
}
