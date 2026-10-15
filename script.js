async function loadAllTeams() {
  const leagues = [
    { league: "NFL", path: "nfl" },
    { league: "CFB", path: "college-football" }
  ];

  let allTeams = [];

  for (const l of leagues) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/${l.path}/teams`;
    const res = await fetch(url);
    const data = await res.json();

    const teams = data.sports[0].leagues[0].teams.map(t => {
      const info = t.team;
      return {
        league: l.league,
        displayName: info.displayName,
        shortDisplayName: info.shortDisplayName,
        nickname: info.nickname,
        espnTeamId: info.id,
        color: info.color || "#111827",
        alternateColor: info.alternateColor || "#374151",
        logoUrl: info.logos?.[0]?.href || ""
      };
    });

    allTeams = allTeams.concat(teams);
  }

  return allTeams;
}


var currentLeague = "NFL";
var selectedTeam = null;

var leagueToggle = document.getElementById("leagueToggle");
var seasonSelect = document.getElementById("seasonSelect");
var teamSearch = document.getElementById("teamSearch");
var teamsGrid = document.getElementById("teamsGrid");
var scoresList = document.getElementById("scoresList");

function detectFootballSeason() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  return month >= 8 ? year : year - 1;
}

function generateSeasonOptions() {
  var currentSeason = detectFootballSeason();
  var seasons = [];
  for (var i = 0; i < 5; i++) {
    seasons.push(currentSeason - i);
  }
  return seasons;
}

function populateSeasonDropdown() {
  var seasons = generateSeasonOptions();
  seasonSelect.innerHTML = "";
  for (var i = 0; i < seasons.length; i++) {
    var season = seasons[i];
    var opt = document.createElement("option");
    opt.value = season;
    opt.textContent = season;
    seasonSelect.appendChild(opt);
  }
  seasonSelect.value = detectFootballSeason();
}

populateSeasonDropdown();

let TEAMS = [];

loadAllTeams().then(t => {
  TEAMS = t;
  renderTeams();
});


function renderTeams() {
  teamsGrid.innerHTML = "";
  var search = teamSearch.value.toLowerCase();

  var filtered = TEAMS.filter(function (t) {
    if (t.league !== currentLeague) return false;

    var name = (t.displayName || "").toLowerCase();
    var short = (t.shortDisplayName || "").toLowerCase();
    var nick = (t.nickname || "").toLowerCase();

    return (
      name.indexOf(search) !== -1 ||
      short.indexOf(search) !== -1 ||
      nick.indexOf(search) !== -1
    );
  });

  filtered.sort(function (a, b) {
    var aKey = (a.displayName || "").toLowerCase();
    var bKey = (b.displayName || "").toLowerCase();
    return aKey.localeCompare(bKey);
  });

  filtered.forEach(function (team) {
    var card = document.createElement("div");
    card.className = "team-card";
    card.style.background = team.color || "#111827";

    card.innerHTML = `
      <div class="team-logo-wrap">
        <img src="${team.logoUrl}">
      </div>
      <div>${team.shortDisplayName || ""}</div>
      <div><strong>${team.nickname || ""}</strong></div>
    `;

    card.onclick = function () {
      selectTeam(team);
    };

    if (selectedTeam && selectedTeam.espnTeamId === team.espnTeamId) {
      card.classList.add("selected");
    }

    teamsGrid.appendChild(card);
  });
}

function safeScore(scoreObj) {
  if (!scoreObj) return "0";
  if (typeof scoreObj === "string" || typeof scoreObj === "number") return scoreObj;
  if (scoreObj.value !== undefined) return scoreObj.value;
  return "0";
}

function selectTeam(team) {
  selectedTeam = team;
  renderTeams();
  loadScores(team);
}

function loadScores(team) {
  scoresList.innerHTML = "Loading…";

  var season = seasonSelect.value;
  var leaguePath = team.league === "NFL" ? "nfl" : "college-football";

  var url =
    "https://site.api.espn.com/apis/site/v2/sports/football/" +
    leaguePath +
    "/teams/" +
    team.espnTeamId +
    "/schedule?season=" +
    season;

  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      var events = data && data.events ? data.events : [];
      if (!events.length) {
        scoresList.innerHTML = "No games found for this season.";
        return;
      }

      scoresList.innerHTML = "";

      events.forEach(function (ev) {
        var comp = ev.competitions && ev.competitions[0] ? ev.competitions[0] : null;
        if (!comp || !comp.competitors) return;

        var home = comp.competitors.find(function (c) {
          return c.homeAway === "home";
        });
        var away = comp.competitors.find(function (c) {
          return c.homeAway === "away";
        });
        if (!home || !away) return;

        var homeScore = safeScore(home.score);
        var awayScore = safeScore(away.score);

        var weekText = ev.week && ev.week.text ? ev.week.text : "Week";
        var dateText = ev.date ? new Date(ev.date).toLocaleDateString() : "";

        var card = document.createElement("div");
        card.className = "score-card";

        card.innerHTML = `
          <div><strong>${weekText}</strong> — ${dateText}</div>

          <div class="score-grid">
            <div class="score-team">${away.team.displayName}</div>
            <div class="score-value">${awayScore}</div>

            <div class="score-team">${home.team.displayName}</div>
            <div class="score-value">${homeScore}</div>
          </div>

          <div class="score-vs">${away.team.displayName} @ ${home.team.displayName}</div>
        `;

        scoresList.appendChild(card);
      });
    })
    .catch(function () {
      scoresList.innerHTML = "Error loading scores.";
    });
}

leagueToggle.onclick = function (e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  currentLeague = btn.dataset.league;
  Array.prototype.forEach.call(leagueToggle.children, function (b) {
    b.classList.remove("active");
  });
  btn.classList.add("active");
  selectedTeam = null;
  scoresList.innerHTML = "";
  renderTeams();
};

seasonSelect.onchange = function () {
  if (selectedTeam) loadScores(selectedTeam);
};

teamSearch.oninput = renderTeams;
