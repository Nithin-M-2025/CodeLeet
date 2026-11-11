import { useEffect, useMemo, useState } from "react";
import { SECTIONS } from "./data.js";
import { GRAPH_SECTIONS } from "./graph-data.js";
import { CORE_SECTIONS } from "./core-data.js";

const STORAGE_KEY = "dp-leetcode-checklist-v1";

// DP sections keep indices 0..n-1 so saved ticks stay valid; graph, then core sections are appended after them.
const ALL_SECTIONS = [
  ...SECTIONS.map((s) => ({ ...s, group: "dp" })),
  ...GRAPH_SECTIONS.map((s) => ({ ...s, group: "graph" })),
  ...CORE_SECTIONS.map((s) => ({ ...s, group: "core" })),
];
const TABS = [
  ["dp", "DP"],
  ["graph", "Graphs (Infosys SP)"],
  ["core", "Core Topics"],
];

// Progress carried over from the PDF (section index : problem number)
const INITIAL_PROGRESS = { "2:494": true };

// Same problem can sit in several patterns, so each checkbox is keyed per pattern.
const keyOf = (sectionIdx, num) => `${sectionIdx}:${num}`;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return INITIAL_PROGRESS;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [done, setDone] = useState(loadProgress);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | todo | done
  const [tab, setTab] = useState("dp");
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
      /* storage full or blocked – ignore */
    }
  }, [done]);

  const toggle = (k) =>
    setDone((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });

  const tabTotals = useMemo(() => {
    const t = Object.fromEntries(
      TABS.map(([v]) => [v, { total: 0, checked: 0 }])
    );
    ALL_SECTIONS.forEach((s, i) =>
      s.problems.forEach(([n]) => {
        t[s.group].total++;
        if (done[keyOf(i, n)]) t[s.group].checked++;
      })
    );
    return t;
  }, [done]);
  const totals = tabTotals[tab];

  const q = query.trim().toLowerCase();

  const visible = ALL_SECTIONS.map((s, i) => ({ s, i }))
    .filter(({ s }) => s.group === tab)
    .map(({ s, i }) => {
    const items = s.problems.filter(([n, title]) => {
      const isDone = !!done[keyOf(i, n)];
      if (filter === "done" && !isDone) return false;
      if (filter === "todo" && isDone) return false;
      if (q && !(String(n).startsWith(q) || title.toLowerCase().includes(q)))
        return false;
      return true;
    });
    const checked = s.problems.filter(([n]) => done[keyOf(i, n)]).length;
    return { ...s, idx: i, items, checked };
  });

  const resetAll = () => {
    const label = TABS.find(([v]) => v === tab)[1];
    if (!window.confirm(`Clear all ticked ${label} problems?`)) return;
    setDone((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const idx = Number(k.split(":")[0]);
        if (ALL_SECTIONS[idx]?.group !== tab) next[k] = prev[k];
      });
      return next;
    });
  };

  const pct = totals.total ? (totals.checked / totals.total) * 100 : 0;

  return (
    <div className="page">
      <header className="top">
        <div className="top-inner">
          <div className="title-row">
            <h1>LeetCode checklist</h1>
            <p className="count">
              <strong>{totals.checked}</strong> of {totals.total} solved
            </p>
          </div>
          <div className="tabs" role="tablist" aria-label="Topic">
            {TABS.map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={tab === v}
                className={tab === v ? "on" : ""}
                onClick={() => setTab(v)}
              >
                {label}
                <span className="tab-count">
                  {tabTotals[v].checked}/{tabTotals[v].total}
                </span>
              </button>
            ))}
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totals.total}
            aria-valuenow={totals.checked}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="controls">
            <input
              type="search"
              placeholder="Search by number or title"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search problems"
            />
            <div className="seg" role="group" aria-label="Filter">
              {[
                ["all", "All"],
                ["todo", "To do"],
                ["done", "Done"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={filter === v ? "on" : ""}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="ghost" onClick={resetAll}>
              Reset progress
            </button>
          </div>
        </div>
      </header>

      <main>
        {visible.map((s) => {
          if (s.items.length === 0) return null;
          const isCollapsed = collapsed[s.idx] && !q;
          return (
            <section key={s.idx} className="pattern">
              <button
                className="pattern-head"
                aria-expanded={!isCollapsed}
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [s.idx]: !c[s.idx] }))
                }
              >
                <span className="chev" data-open={!isCollapsed}>
                  ▸
                </span>
                <h2>{s.title}</h2>
                <span className="mini">
                  <span
                    style={{
                      width: `${(s.checked / s.problems.length) * 100}%`,
                    }}
                  />
                </span>
                <span className="tally">
                  {s.checked}/{s.problems.length}
                </span>
              </button>

              {!isCollapsed && (
                <ul>
                  {s.items.map(([n, title]) => {
                    const k = keyOf(s.idx, n);
                    const isDone = !!done[k];
                    return (
                      <li key={k} className={isDone ? "is-done" : ""}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggle(k)}
                          />
                          <span className="num">{n}</span>
                          <span className="name">{title}</span>
                        </label>
                        <a
                          href={`https://leetcode.com/problemset/?search=${n}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open problem ${n} on LeetCode`}
                          title="Open on LeetCode"
                        >
                          Open
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {visible.every((s) => s.items.length === 0) && (
          <p className="empty">No problems match. Clear the search or switch the filter.</p>
        )}
      </main>
    </div>
  );
}