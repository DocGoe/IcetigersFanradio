/******************************************************
 * main.js
 ******************************************************/

// Fallback-CSV: wird geladen, wenn localStorage leer ist
const DEFAULT_CSV_URL = "default.csv";

/* Globale Variablen */
let data = { teams: [] };
let allCsvHeaders = [];
let isEditing = false;

/* Layout: 3 Spalten + Pool */
let poolStats = [];
let layoutStats = [[], [], []];

/* DOM-Elemente */
const teamASelect       = document.getElementById('teamASelect');
const teamBSelect       = document.getElementById('teamBSelect');
const loadTeamsBtn      = document.getElementById('loadTeamsBtn');
const editModeBtn       = document.getElementById('editModeBtn');
const helpBtn           = document.getElementById('helpBtn');
const teamsContainer    = document.getElementById('teamsContainer');
const outputDiv         = document.getElementById('output');
const statsDndPanel     = document.getElementById('statsDndPanel');
const toggleDndPanelBtn = document.getElementById('toggleDndPanelBtn');
const statPool          = document.getElementById('statPool');
const col1              = document.getElementById('column1');
const col2              = document.getElementById('column2');
const col3              = document.getElementById('column3');
const saveLayoutBtn     = document.getElementById('saveLayoutBtn');

// Neue Buttons für PDF- und XLS-Export
const pdfExportBtn      = document.getElementById('pdfExportBtn');
const xlsExportBtn      = document.getElementById('xlsExportBtn');

// CSV-Quelle umschalten
const localCsvRadio     = document.getElementById('localCsvRadio');
const urlCsvRadio       = document.getElementById('urlCsvRadio');
const localCsvSection   = document.getElementById('localCsvSection');
const urlCsvSection     = document.getElementById('urlCsvSection');

// File Upload
const importCsvBtn = document.getElementById('importCsvBtn');
const csvUpload    = document.getElementById('csvUpload');

// URL Input
const csvUrlInput   = document.getElementById('csvUrlInput');
const loadFromUrlBtn= document.getElementById('loadFromUrlBtn');

/*
  ----------------------------------------------------------------------------
    1) DOMContentLoaded
  ----------------------------------------------------------------------------
*/
window.addEventListener('DOMContentLoaded', async () => {
  // 1) CSV laden
  const storedCsv = localStorage.getItem('myCsvData');
  let csvToUse = storedCsv;

  if (!csvToUse) {
    try {
      const resp = await fetch(DEFAULT_CSV_URL);
      csvToUse = await resp.text();
    } catch(e) {
      console.error("Konnte default.csv nicht laden:", e);
      csvToUse = "";
    }
  }

  // 2) Teams bauen
  const rows = parseCSV_semicolon(csvToUse);
  data.teams = buildTeamsFromCSV(rows);

  if (rows.length > 0) {
    allCsvHeaders = Object.keys(rows[0]);
  }

  // 3) Layout aus localStorage
  const storedLayout = localStorage.getItem('myStatsLayout');
  if (storedLayout) {
    try {
      const parsed = JSON.parse(storedLayout);
      if (parsed.pool && parsed.layout) {
        poolStats   = parsed.pool;
        layoutStats = parsed.layout;
      } else {
        initStatsLayout();
      }
    } catch(e) {
      initStatsLayout();
    }
  } else {
    initStatsLayout();
  }

  // 4) UI-Setup
  populateTeamSelects();
  prepareDragAndDrop();
  renderStatsDndUI();
  loadSelectedTeams();

  // 5) Event-Listener
  loadTeamsBtn.addEventListener('click', loadSelectedTeams);
  editModeBtn.addEventListener('click', toggleEditMode);
  toggleDndPanelBtn.addEventListener('click', () => {
    statsDndPanel.style.display = (statsDndPanel.style.display === 'block') ? 'none' : 'block';
  });

  saveLayoutBtn.addEventListener('click', saveLayoutToStorage);
  saveLayoutBtn.addEventListener('click', () => {
    // Panel schließen
    statsDndPanel.style.display = (statsDndPanel.style.display === 'block') ? 'none' : 'block';
  });

  helpBtn.addEventListener('click', () => {
    const help = document.getElementById('helpSection');
    help.style.display = (help.style.display === 'none' || !help.style.display)
      ? 'block'
      : 'none';
  });

  // CSV Toggle
  //localCsvRadio.addEventListener('change', toggleCsvSource);
  //urlCsvRadio.addEventListener('change', toggleCsvSource);

  // File-Upload
  importCsvBtn.addEventListener('click', () => {
    if (!csvUpload.files || csvUpload.files.length === 0) {
      alert("Bitte zuerst eine CSV-Datei auswählen.");
      return;
    }
    const file = csvUpload.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      const newCsvData = e.target.result;
      localStorage.setItem('myCsvData', newCsvData);

      const rows = parseCSV_semicolon(newCsvData);
      data.teams = buildTeamsFromCSV(rows);

      if (rows.length > 0) {
        allCsvHeaders = Object.keys(rows[0]);
      }
      initStatsLayout();
      renderStatsDndUI();
      populateTeamSelects();
      loadSelectedTeams();
      alert("CSV importiert und im Local Storage gespeichert!");
    };
    reader.readAsText(file);
  });

  // URL-Import
  loadFromUrlBtn.addEventListener('click', async () => {
    const url = csvUrlInput.value.trim();
    if (!url) {
      alert("Bitte eine CSV-URL eingeben.");
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der CSV: ${response.status}`);
      }
      const textData = await response.text();
      localStorage.setItem('myCsvData', textData);

      const rows = parseCSV_semicolon(textData);
      data.teams = buildTeamsFromCSV(rows);

      if (rows.length > 0) {
        allCsvHeaders = Object.keys(rows[0]);
      }
      initStatsLayout();
      renderStatsDndUI();
      populateTeamSelects();
      loadSelectedTeams();
      alert("CSV aus URL importiert und im Local Storage gespeichert!");
    } catch (err) {
      alert("Fehler beim Laden der CSV-Datei: " + err);
    }
  });

  // Neue Buttons für PDF/XLS
  pdfExportBtn.addEventListener('click', () => {
    exportTeamsAsPDF();
  });
  xlsExportBtn.addEventListener('click', () => {
    exportTeamsAsXLS();
  });
});

/*
  ----------------------------------------------------------------------------
    2) CSV Parser (Semikolon-getrennt)
  ----------------------------------------------------------------------------
*/
function parseCSV_semicolon(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length <= 1) {
    return [];
  }
  const headers = lines[0].split(";").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(";");
    const rowObj = {};
    headers.forEach((h, i) => {
      rowObj[h] = (cols[i] || "").trim();
    });
    return rowObj;
  });
}

/*
  ----------------------------------------------------------------------------
    3) Teams-Struktur
  ----------------------------------------------------------------------------
*/
function buildTeamsFromCSV(rows) {
  const teamsById = {};

  rows.forEach(r => {
    const teamId   = r["team"] || "UNKNOWN";
    const position = r["position"] || "F";
    const number   = parseInt(r["no"] || 0, 10);

    const firstName= r["first_name"] || "";
    const lastName = r["last_name"] || "";
    const playerName= `${firstName} ${lastName}`.trim();

    // Wichtige Stats
    const goals   = parseInt(r["goals"] || 0, 10);
    const assists = parseInt(r["assists"] || 0, 10);
    const points  = parseInt(r["points"] || 0, 10);

    // Goalie
    const wins    = parseInt(r["wins"] || 0, 10);
    const losses  = parseInt(r["losses"] || 0, 10);
    const savePct = parseFloat(r["savePct"] || 0.0) || 0.0;
    const gaa     = parseFloat(r["gaa"] || 0.0) || 0.0;

    const info = TEAM_INFO[teamId] || TEAM_INFO["UNKNOWN"];
    if (!teamsById[teamId]) {
      teamsById[teamId] = {
        id: teamId,
        name: info.name,
        color: info.color,
        textColor: info.textColor,
        players: []
      };
    }

    const playerObj = {
      number,
      name: playerName,
      position,
      csvRow: { ...r },
      isPlaying: true,
      stats: {
        goals, assists, points,
        wins, losses, savePct, gaa,
        goalsRank: 0,
        assistsRank: 0,
        pointsRank: 0
      },
      symbol: ""
    };
    teamsById[teamId].players.push(playerObj);
  });

  const teamsArray = Object.values(teamsById);
  teamsArray.forEach(team => {
    computeTeamRanks(team.players);
    markTopPlayers(team.players);
  });
  return teamsArray;
}

/*
  ----------------------------------------------------------------------------
    Team-Farben
  ----------------------------------------------------------------------------
*/
const TEAM_INFO = {
  "RBM": { name: "EHC Red Bull München", color: "#0039A6", textColor: "#FFFFFF" },
  "BHV": { name: "Fischtown Pinguins Bremerhaven", color: "#E2001A", textColor: "#FFFFFF" },
  "MAN": { name: "Adler Mannheim", color: "#00366C", textColor: "#FFFFFF" },
  "ING": { name: "ERC Ingolstadt", color: "#0061A2", textColor: "#FFFFFF" },
  "DEG": { name: "Düsseldorfer EG", color: "#DE0A17", textColor: "#FFFFFF" },
  "KEC": { name: "Kölner Haie", color: "#E32219", textColor: "#FFFFFF" },
  "EBB": { name: "Eisbären Berlin", color: "#1C375C", textColor: "#FFFFFF" },
  "SWW": { name: "Schwenninger Wild Wings", color: "#0038A8", textColor: "#FFFFFF" },
  "NIT": { name: "Nürnberg Ice Tigers", color: "#e42129", textColor: "#000000" },
  "AEV": { name: "Augsburger Panther", color: "#00923F", textColor: "#FFFFFF" },
  "STR": { name: "Straubing Tigers", color: "#1C6FB3", textColor: "#FFFFFF" },
  "WOB": { name: "Grizzlys Wolfsburg", color: "#F57F26", textColor: "#FFFFFF" },
  "IEC": { name: "Iserlohn Roosters", color: "#2E3192", textColor: "#FFFFFF" },
  "FRA": { name: "Löwen Frankfurt", color: "#FA6E12", textColor: "#000000" },
  "UNKNOWN": { name: "Unbekanntes Team", color: "#888", textColor: "#fff" }
};

/*
  ----------------------------------------------------------------------------
    4) Ranking & Top-Spieler
  ----------------------------------------------------------------------------
*/
function computeTeamRanks(players) {
  const byGoals   = [...players].sort((a, b) => b.stats.goals - a.stats.goals);
  const byAssists = [...players].sort((a, b) => b.stats.assists - a.stats.assists);
  const byPoints  = [...players].sort((a, b) => b.stats.points - a.stats.points);

  byGoals.forEach   ((p, i) => { p.stats.goalsRank   = i + 1; });
  byAssists.forEach ((p, i) => { p.stats.assistsRank = i + 1; });
  byPoints.forEach  ((p, i) => { p.stats.pointsRank  = i + 1; });
}

function markTopPlayers(players) {
  players.forEach(p => {
    p.symbol = "";
    if (p.stats.goalsRank   === 1) p.symbol += "#";
    if (p.stats.assistsRank === 1) p.symbol += "+";
    if (p.stats.pointsRank  === 1) p.symbol += "*";
  });
}

/*
  ----------------------------------------------------------------------------
    5) Select-Boxen füllen & Teams laden
  ----------------------------------------------------------------------------
*/
function populateTeamSelects() {
  teamASelect.innerHTML = "";
  teamBSelect.innerHTML = "";

  data.teams.forEach(team => {
    const optionA = document.createElement('option');
    optionA.value = team.id;
    optionA.textContent = team.name;
    teamASelect.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = team.id;
    optionB.textContent = team.name;
    teamBSelect.appendChild(optionB);
  });
}

function loadSelectedTeams() {
  teamsContainer.innerHTML = "";
  outputDiv.innerHTML = "";

  const selectedTeamA = data.teams.find(t => t.id === teamASelect.value);
  const selectedTeamB = data.teams.find(t => t.id === teamBSelect.value);

  if (selectedTeamA) {
    const elemA = isEditing ? createTeamElementEdit(selectedTeamA) : createTeamElement(selectedTeamA);
    teamsContainer.appendChild(elemA);
  }
  if (selectedTeamB) {
    const elemB = isEditing ? createTeamElementEdit(selectedTeamB) : createTeamElement(selectedTeamB);
    teamsContainer.appendChild(elemB);
  }
}

function toggleEditMode() {
  isEditing = !isEditing;
  editModeBtn.textContent = isEditing ? "Bearbeiten beenden" : "Bearbeiten";
  loadSelectedTeams();
}

/*
  ----------------------------------------------------------------------------
    6) Team-Komponenten
  ----------------------------------------------------------------------------
*/
function createTeamElement(team) {
  const container = document.createElement('div');
  container.className = 'team';

  const headline = document.createElement('h2');
  headline.textContent = team.name;
  container.appendChild(headline);

  // Torhüter (GK)
  const goalies = team.players
    .filter(p => p.position === 'GK' && p.isPlaying)
    .sort((a, b) => a.number - b.number);
  if (goalies.length > 0) {
    const goalieRow = document.createElement('div');
    goalieRow.classList.add('player-row', 'goalies-row');
    goalies.forEach(g => {
      const btn = createPlayerButton(team, g);
      goalieRow.appendChild(btn);
    });
    container.appendChild(goalieRow);
  }

  // Andere Spieler (F, D, ...)
  const others = team.players
    .filter(p => p.position !== 'GK' && p.isPlaying)
    .sort((a, b) => a.number - b.number);
  const chunkSize = 5;
  for (let i = 0; i < others.length; i += chunkSize) {
    const row = document.createElement('div');
    row.className = 'player-row';
    others.slice(i, i + chunkSize).forEach(player => {
      const btn = createPlayerButton(team, player);
      row.appendChild(btn);
    });
    container.appendChild(row);
  }

  return container;
}

function createTeamElementEdit(team) {
  const container = document.createElement('div');
  container.className = 'team';

  const headline = document.createElement('h2');
  headline.textContent = team.name + " (Bearbeiten)";
  container.appendChild(headline);

  const allPlayers = [...team.players].sort((a, b) => a.number - b.number);
  const editList = document.createElement('div');
  editList.className = 'edit-player-list';

  allPlayers.forEach(player => {
    const rowDiv = document.createElement('div');
    if (!player.isPlaying) {
      rowDiv.classList.add('player-disabled');
    }
    const label = document.createElement('span');
    label.textContent = `${player.number} ${player.name} (${player.position})`;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hide-toggle-btn';
    toggleBtn.textContent = player.isPlaying ? "Hide" : "Show";
    toggleBtn.addEventListener('click', (evt) => {
      player.isPlaying = !player.isPlaying;
      loadSelectedTeams();
      evt.stopPropagation();
    });

    rowDiv.appendChild(label);
    rowDiv.appendChild(toggleBtn);
    editList.appendChild(rowDiv);
  });

  container.appendChild(editList);
  return container;
}

/*
  ----------------------------------------------------------------------------
    7) Spieler-Button -> Klick -> Detailanzeige
  ----------------------------------------------------------------------------
*/
function createPlayerButton(team, player) {
  const btn = document.createElement('button');
  btn.className = "player-btn";

  let superscript = player.symbol ? `<sup>${player.symbol}</sup>` : "";
  btn.innerHTML = `${player.number}${superscript}`;
  btn.style.backgroundColor = team.color;
  btn.style.color = team.textColor;

  btn.addEventListener('click', () => {
    displayPlayerInfo(team, player);
  });
  return btn;
}

/*
  ----------------------------------------------------------------------------
    8) Detail-Anzeige (rechts im Output)
  ----------------------------------------------------------------------------
*/
function displayPlayerInfo(team, player) {
  const isGoalie = (player.position === "GK");
  const titleType = isGoalie ? 'Torhüter-Info' : 'Skater-Info';

  const heading = `<h3>${titleType} (#${player.number} ${player.csvRow.full_name})</h3>`;
  let html = heading;
  html += `<div class="stats-columns">`;

  for (let i = 0; i < 3; i++) {
    html += `<div class="stats-column-inner">`;
    layoutStats[i].forEach(statKey => {
      let val = (player.csvRow[statKey] !== undefined) ? player.csvRow[statKey] : "n/a";

      // Alter: x Jahre y Tage
      if (statKey === "age" && val !== "n/a") {
        const floatAge = parseFloat(val.replace(",", ".")) || 0;
        const years = Math.floor(floatAge);
        const days = Math.round((floatAge - years) * 365);
        val = `${years} Jahre ${days} Tage`;
      }

      const friendly = STAT_LABELS[statKey] || statKey;
      let rankSuffix = "";
      if (statKey === "goals") {
        rankSuffix = ` (${player.stats.goalsRank}.)`;
      } else if (statKey === "assists") {
        rankSuffix = ` (${player.stats.assistsRank}.)`;
      } else if (statKey === "points") {
        rankSuffix = ` (${player.stats.pointsRank}.)`;
      }

      html += `<p><strong>${friendly}:</strong> ${val}${rankSuffix}</p>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  outputDiv.innerHTML = html;
}

/*
  ----------------------------------------------------------------------------
    9) Drag & Drop Layout
  ----------------------------------------------------------------------------
*/
function initStatsLayout() {
  const defaultStats = [
    "games_played", "goals", "assists", "points", "plus_minus"
  ];

  // poolStats = alle CSV-Spalten - defaultStats
  poolStats = [...allCsvHeaders].filter(s => !defaultStats.includes(s));
  // layoutStats = 3 Spalten
  layoutStats = [
    [...defaultStats],
    [],
    []
  ];
}

function renderStatsDndUI() {
  statPool.innerHTML = '<h3>Pool</h3>';
  col1.innerHTML     = '<h3>Spalte 1</h3>';
  col2.innerHTML     = '<h3>Spalte 2</h3>';
  col3.innerHTML     = '<h3>Spalte 3</h3>';

  poolStats.forEach(stat => {
    const item = createDraggableStatItem(stat);
    statPool.appendChild(item);
  });
  layoutStats[0].forEach(stat => {
    const item = createDraggableStatItem(stat);
    col1.appendChild(item);
  });
  layoutStats[1].forEach(stat => {
    const item = createDraggableStatItem(stat);
    col2.appendChild(item);
  });
  layoutStats[2].forEach(stat => {
    const item = createDraggableStatItem(stat);
    col3.appendChild(item);
  });
}

function createDraggableStatItem(statName) {
  const div = document.createElement('div');
  div.className = 'stat-item';
  div.draggable = true;

  const friendly = STAT_LABELS[statName] || statName;
  div.textContent = friendly;

  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', statName);
  });
  return div;
}

function prepareDragAndDrop() {
  [statPool, col1, col2, col3].forEach((zone) => {
    zone.addEventListener('dragover', (evt) => {
      evt.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', (evt) => {
      evt.preventDefault();
      zone.classList.remove('dragover');
      const statName = evt.dataTransfer.getData('text/plain');
      moveStatToZone(statName, zone);
    });
  });
}

function moveStatToZone(statName, dropZone) {
  // Entferne es aus allen Arrays
  poolStats = poolStats.filter(s => s !== statName);
  layoutStats[0] = layoutStats[0].filter(s => s !== statName);
  layoutStats[1] = layoutStats[1].filter(s => s !== statName);
  layoutStats[2] = layoutStats[2].filter(s => s !== statName);

  // Füge es dem Ziel hinzu
  if (dropZone.id === 'statPool') {
    poolStats.push(statName);
  } else if (dropZone.id === 'column1') {
    layoutStats[0].push(statName);
  } else if (dropZone.id === 'column2') {
    layoutStats[1].push(statName);
  } else if (dropZone.id === 'column3') {
    layoutStats[2].push(statName);
  }

  // Speichern + Neu rendern
  autoSaveLayout();
  renderStatsDndUI();
}

function autoSaveLayout() {
  const layoutObj = { pool: poolStats, layout: layoutStats };
  localStorage.setItem('myStatsLayout', JSON.stringify(layoutObj));
}

/*
  ----------------------------------------------------------------------------
    10) Layout speichern
  ----------------------------------------------------------------------------
*/
function saveLayoutToStorage() {
  autoSaveLayout();
  alert("Layout gespeichert!");
}

/*
  ----------------------------------------------------------------------------
    11) PDF & XLS
  ----------------------------------------------------------------------------
*/

// A) PDF-Export
function exportTeamsAsPDF() {
  const selectedTeamA = data.teams.find(t => t.id === teamASelect.value);
  const selectedTeamB = data.teams.find(t => t.id === teamBSelect.value);

  if (!selectedTeamA && !selectedTeamB) {
    alert("Keine Teams ausgewählt.");
    return;
  }

  const chosenColumns = [...layoutStats[0], ...layoutStats[1], ...layoutStats[2]];
  if (chosenColumns.length === 0) {
    alert("Keine Stats im Layout definiert.");
    return;
  }

  let htmlForPrint = `
    <html>
    <head>
      <title>Statistiken - PDF</title>
      <style>
        @page { size: A4 landscape; margin: 20mm; }
        .page-break { page-break-after: always; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; }
        h2 { margin-top: 0; }
      </style>
    </head>
    <body>
  `;

  if (selectedTeamA) {
    htmlForPrint += buildTeamTableHTML(selectedTeamA, chosenColumns);
    htmlForPrint += `<div class="page-break"></div>`;
  }
  if (selectedTeamB) {
    htmlForPrint += buildTeamTableHTML(selectedTeamB, chosenColumns);
  }
  htmlForPrint += `</body></html>`;

  const printWin = window.open("", "_blank", "width=1000,height=800");
  if (!printWin) {
    alert("Pop-up Blocker aktiv? Bitte Pop-ups zulassen.");
    return;
  }
  printWin.document.write(htmlForPrint);
  printWin.document.close();
  printWin.focus();
  printWin.print();
  // printWin.close(); // optional
}

// B) XLS-Export
function exportTeamsAsXLS() {
  const selectedTeamA = data.teams.find(t => t.id === teamASelect.value);
  const selectedTeamB = data.teams.find(t => t.id === teamBSelect.value);

  if (!selectedTeamA && !selectedTeamB) {
    alert("Keine Teams ausgewählt.");
    return;
  }

  const chosenColumns = [...layoutStats[0], ...layoutStats[1], ...layoutStats[2]];
  if (chosenColumns.length === 0) {
    alert("Keine Stats im Layout definiert.");
    return;
  }

  const teamsArr = [selectedTeamA, selectedTeamB].filter(Boolean);
  exportToExcel(teamsArr, chosenColumns);
}

/*
  Erzeugt HTML-Tabelle (String) für ein Team
*/
function buildTeamTableHTML(team, columns) {
  const players = team.players.filter(p => p.isPlaying).sort((a,b) => a.number - b.number);

  let html = `<h2>${team.name}</h2>`;
  html += `<table>`;

  html += `<thead><tr>`;
  html += `<th># / Name</th>`;
  columns.forEach(col => {
    const friendly = STAT_LABELS[col] || col;
    html += `<th>${friendly}</th>`;
  });
  html += `</tr></thead>`;

  html += `<tbody>`;
  players.forEach(player => {
    let symbolSup = player.symbol ? ` <sup>${player.symbol}</sup>` : '';
    html += `<tr>`;
    html += `<td>#${player.number} ${player.name}${symbolSup}</td>`;

    columns.forEach(col => {
      let val = (player.csvRow[col] !== undefined) ? player.csvRow[col] : "n/a";

      // Beispiel: Alter => x Jahre y Tage
      if (col === 'age' && val !== 'n/a') {
        const floatAge = parseFloat(val.replace(",", ".")) || 0;
        const years = Math.floor(floatAge);
        const days = Math.round((floatAge - years) * 365);
        val = `${years} Jahre ${days} Tage`;
      }

      html += `<td>${val}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/*
  ----------------------------------------------------------------------------
    12) Excel-Export (CSV)
  ----------------------------------------------------------------------------
*/
function exportToExcel(selectedTeams, columns) {
  let csvContent = "\ufeff";;

  selectedTeams.forEach(team => {
    csvContent += `"${team.name}"\n`;

    // Header
    let headerRow = ["# / Name"];
    columns.forEach(col => {
      const friendly = STAT_LABELS[col] || col;
      headerRow.push(friendly);
    });
    csvContent += headerRow.map(escapeCsvCell).join(";") + "\n";

    // Players
    const players = team.players.filter(p => p.isPlaying).sort((a,b) => a.number - b.number);
    players.forEach(player => {
      let symbolSup = player.symbol ? ` ${player.symbol}` : "";
      let rowData = [`#${player.number} ${player.name}${symbolSup}`];

      columns.forEach(col => {
        let rawVal = (player.csvRow[col] !== undefined) ? player.csvRow[col] : "n/a";

        // z. B. Alter -> x Jahre y Tage
        if (col === 'age' && rawVal !== 'n/a') {
          const floatAge = parseFloat(rawVal.replace(",", ".").replace("%","")) || 0;
          const years = Math.floor(floatAge);
          const days = Math.round((floatAge - years) * 365);
          rawVal = `${years} Jahre ${days} Tage`;
        }

        // Versuche, '%'-Werte & Kommazahlen als echte Zahl zu erkennen
        let numericCandidate = rawVal.replace(/%/g, "").replace(",", ".").trim();
        let parsed = parseFloat(numericCandidate);

        // Wenn es eine Zahl ist => '.' -> ',' => Excel-Deutsch
        if (!isNaN(parsed) && numericCandidate !== "" && numericCandidate !== "n/a") {
          let valWithComma = parsed.toString().replace(/\./g, ",");
          rawVal = valWithComma;
        }

        rowData.push(rawVal);
      });

      csvContent += rowData.map(escapeCsvCell).join(";") + "\n";
    });

    csvContent += "\n\n"; // Leerzeilen trennen Teams
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'stats_export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/*
  ----------------------------------------------------------------------------
    13) CSV Toggle
  ----------------------------------------------------------------------------
*/
function toggleCsvSource() {
  if (localCsvRadio.checked) {
    localCsvSection.style.display = 'block';
    urlCsvSection.style.display = 'none';
  } else {
    localCsvSection.style.display = 'none';
    urlCsvSection.style.display = 'block';
  }
}

/*
  ----------------------------------------------------------------------------
    14) CSV-Escaping
  ----------------------------------------------------------------------------
*/
function escapeCsvCell(str) {
  let text = String(str).replace(/<[^>]+>/g, "").trim();
  text = text.replace(/"/g, '""');
  return `"${text}"`;
}

/*
  ----------------------------------------------------------------------------
    15) STAT_LABELS
  ----------------------------------------------------------------------------
*/
const STAT_LABELS = {
  // Hier sämtliche Mapping-Labels
  "player_id": "Spieler-ID",
  "season_type": "Saison-Typ",
  "team": "Team-Kürzel",
  "no": "Rückennummer",
  "position": "Position",
  "first_name": "Vorname",
  "last_name": "Nachname",
  "full_name": "Voller Name",
  "country": "Land",
  "shoots": "Schusshand",
  "date_of_birth": "Geburtsdatum",
  "age": "Alter",
  "height": "Größe (cm)",
  "weight": "Gewicht (kg)",
  "games_played": "Spiele",
  "goals": "Tore",
  "assists": "Vorlagen",
  "primary_assists": "Primäre Vorlagen",
  "secondary_assists": "Sek. Vorlagen",
  "points": "Punkte",
  "primary_points": "Primäre Punkte",
  "plus": "Plus",
  "minus": "Minus",
  "plus_minus": "+/-",
  "pp_goals": "PP-Tore",
  "pp_assists": "PP-Vorlagen",
  "pp_primary_assists": "PP-prim. Vorlagen",
  "pp_secondary_assists": "PP-sek. Vorlagen",
  "pp_points": "PP-Punkte",
  "sh_goals": "SH-Tore",
  "gw_goals": "Game-Winner (GWG)",
  "shots": "Schüsse ges.",
  "shots_on_goal": "Schüsse aufs Tor",
  "shots_missed": "Schüsse vorbei",
  "shots_blocked": "Schüsse geblockt",
  "shot_pctg": "Schussquote (%)",
  "faceoffs": "Bullys ges.",
  "faceoffs_won": "Bullys gewonnen",
  "faceoffs_lost": "Bullys verloren",
  "faceoff_pctg": "Bully-%",
  "blocked_shots": "Blocks (extra)",
  "shifts": "Wechsel",
  "penalties": "Strafen ges.",
  "pim": "Strafminuten (PIM)",
  "_2min": "2min-Strafen",
  "_5min": "5min-Strafen",
  "_10min": "10min-Strafen",
  "_20min": "20min-Strafen",
  "lazy": "Strafe: Lazy",
  "roughing": "Strafe: Roughing",
  "reckless": "Strafe: Reckless",
  "other": "Strafe: Sonstige",
  "time_on_ice": "Eiszeit ges.",
  "time_on_ice_pp": "Eiszeit (PP)",
  "time_on_ice_sh": "Eiszeit (SH)",
  "time_on_ice_seconds": "Eiszeit ges. (Sek.)",
  "time_on_ice_pp_seconds": "Eiszeit (PP, Sek.)",
  "time_on_ice_sh_seconds": "Eiszeit (SH, Sek.)",
  "goals_per_game": "Tore/Spiel",
  "assists_per_game": "Vorlagen/Spiel",
  "primary_assists_per_game": "Prim. Vorl./Spiel",
  "secondary_assists_per_game": "Sek. Vorl./Spiel",
  "points_per_game": "Punkte/Spiel",
  "pim_per_game": "PIM/Spiel",
  "shots_per_game": "Schüsse/Spiel",
  "shots_on_goal_per_game": "Schüsse aufs Tor/Spiel",
  "shots_missed_per_game": "Schüsse vorbei/Spiel",
  "shots_blocked_per_game": "Geblockte Schüsse/Spiel",
  "blocked_shots_per_game": "Geblockte Sch./Spiel2",
  "shifts_per_game": "Wechsel/Spiel",
  "time_on_ice_per_game": "Eiszeit/Spiel",
  "time_on_ice_pp_per_game": "Eiszeit (PP)/Spiel",
  "time_on_ice_sh_per_game": "Eiszeit (SH)/Spiel",
  "time_on_ice_per_game_seconds": "Eiszeit/Spiel (Sek.)",
  "time_on_ice_pp_per_game_seconds": "Eiszeit (PP)/Spiel (Sek.)",
  "time_on_ice_sh_per_game_seconds": "Eiszeit (SH)/Spiel (Sek.)",
  "goals_per_60": "Tore/60",
  "assists_per_60": "Vorlagen/60",
  "primary_assists_per_60": "Prim. Vorl./60",
  "secondary_assists_per_60": "Sek. Vorl./60",
  "points_per_60": "Punkte/60",
  "shots_per_60": "Schüsse/60",
  "shots_on_goal_per_60": "Torschüsse/60",
  "shots_missed_per_60": "Vorbei/60",
  "shots_blocked_per_60": "Geblockt/60",
  "blocked_shots_per_60": "Blocks/60",
  "pp_goals_per_60": "PP-Tore/60",
  "pp_assists_per_60": "PP-Vorlagen/60",
  "pp_primary_assists_per_60": "PP-prim. Vorl./60",
  "pp_secondary_assists_per_60": "PP-sek. Vorl./60",
  "pp_points_per_60": "PP-Punkte/60",
  "sh_goals_per_60": "SH-Tore/60",
  "wins": "Siege (Goalie)",
  "losses": "Niederlagen (Goalie)",
  "savePct": "Fangquote (Goalie)",
  "gaa": "Gegentorschnitt (Goalie)"
};
