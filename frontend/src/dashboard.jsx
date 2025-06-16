import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
import { useReactToPrint } from "react-to-print";
import Sidebar from "./components/Sidebar";
import "./Dashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

const Dashboard = () => {
  const navigate = useNavigate();
  const componentRef = useRef();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("7days");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [metrics, setMetrics] = useState({
    stress: [],
    mental: [],
    mobile: [],
    academic: [],
    comparisons: {
      stress: {
        todayVsYesterday: null,
        weekVsLastWeek: null,
        monthVsLastMonth: null,
      },
      mobile: {
        todayVsYesterday: null,
        weekVsLastWeek: null,
        monthVsLastMonth: null,
      },
      mental: {
        todayVsYesterday: null,
        weekVsLastWeek: null,
        monthVsLastMonth: null,
      },
      academic: {
        todayVsYesterday: null,
        weekVsLastWeek: null,
        monthVsLastMonth: null,
      },
    },
    trends: {
      improving: [],
      declining: [],
      stable: [],
    },
    alerts: [],
    summary: {
      totalSessions: 0,
      averageStress: 0,
      averageMentalHealth: 0,
      mobileUsageStatus: "normal",
      academicImpact: "low",
    },
    goals: {
      stressReduction: { target: 5, current: 0, progress: 0 },
      mentalWellness: { target: 80, current: 0, progress: 0 },
      screenTime: { target: 4, current: 0, progress: 0 },
    },
  });

  useEffect(() => {
    document.title = "Mentora | Dashboard";
  }, []);

  const fetchAllMetrics = useCallback(
    async (userId) => {
      const extractArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data?.history) return data.history;
        if (data?.predictions) return data.predictions;
        if (data?.data) return data.data;
        if (data?.mobile_usage_history) return data.mobile_usage_history; // Add this line
        return [];
      };

      try {
        const [stressRes, mentalRes, mobileRes, academicRes] =
          await Promise.all([
            fetch(`http://localhost:5001/stresshistory?user_id=${userId}`),
            fetch(`http://localhost:5002/mentalhistory?user_id=${userId}`),
            fetch(`http://localhost:5003/get_user_history?user_id=${userId}`),
            fetch(`http://localhost:5004/academichistory?user_id=${userId}`),
          ]);

        const [stressData, mentalData, mobileData, academicData] =
          await Promise.all([
            stressRes.json(),
            mentalRes.json(),
            mobileRes.json(),
            academicRes.json(),
          ]);

        const processedMetrics = processMetrics({
          stress: extractArray(stressData),
          mental: extractArray(mentalData),
          mobile: extractArray(mobileData),
          academic: extractArray(academicData),
        });

        setMetrics(processedMetrics);
      } catch (err) {
        console.error("Error fetching metrics:", err);
        throw err;
      }
    },
    [dateRange]
  );

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const userId =
          localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
        if (!userId) {
          navigate("/login");
          return;
        }

        // Fetch user data
        const userRes = await fetch(`http://localhost:5000/user/${userId}`);
        if (!userRes.ok) throw new Error("User verification failed");
        const userData = await userRes.json();
        setUser(userData);

        // Fetch all metrics data
        await fetchAllMetrics(userId);

        setLoading(false);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load dashboard data");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    verifyUser();
  }, [navigate, fetchAllMetrics]);

  const processMetrics = (data) => {
    const now = new Date();
    const daysMap = { "7days": 7, "30days": 30, "90days": 90 };
    const days = daysMap[dateRange] || 7;

    // Filter data based on selected date range
    const filterByDateRange = (items) =>
      items.filter((item) => {
        const itemDate = new Date(item.timestamp);
        const cutoffDate = new Date(now - days * 24 * 60 * 60 * 1000);
        return itemDate >= cutoffDate;
      });

    const filteredData = {
      stress: filterByDateRange(data.stress),
      mental: filterByDateRange(data.mental),
      mobile: filterByDateRange(data.mobile),
      academic: filterByDateRange(data.academic),
    };

    // Calculate comprehensive comparisons
    const comparisons = {
      stress: calculateAdvancedComparisons(data.stress, "stress_level"),
      mental: calculateAdvancedComparisons(
        data.mental,
        "prediction_results.depression_level"
      ),
      mobile: calculateAdvancedComparisons(
        data.mobile,
        "prediction_result.prediction"
      ),
      academic: calculateAdvancedComparisons(
        data.academic,
        "predictions.addiction_score"
      ),
    };

    // Calculate trends
    const trends = calculateTrends(filteredData);

    // Generate alerts
    const alerts = generateAlerts(filteredData);

    // Calculate summary statistics
    const summary = calculateSummary(filteredData);

    // Calculate goals progress
    const goals = calculateGoalsProgress(filteredData, summary);

    return {
      ...filteredData,
      comparisons,
      trends,
      alerts,
      summary,
      goals,
    };
  };

  const calculateAdvancedComparisons = (data, keyPath) => {
    if (!data || data.length === 0) return {};

    const now = new Date();
    const getValue = (item, path) => {
      const keys = path.split(".");
      let value = keys.reduce(
        (obj, key) => (obj && obj[key] !== undefined ? obj[key] : null),
        item
      );

      // Handle special cases
      if (
        path === "prediction_results.depression_level" &&
        typeof value === "string"
      ) {
        const levels = { low: 1, moderate: 2, high: 3, severe: 4 };
        return levels[value.toLowerCase()] || 0;
      }
      if (
        path === "prediction_result.prediction" &&
        typeof value === "string"
      ) {
        return value === "addicted" ? 1 : 0;
      }

      return parseFloat(value) || 0;
    };

    // Today vs Yesterday
    const todayValue =
      data.length > 0 ? getValue(data[data.length - 1], keyPath) : 0;
    const yesterdayValue =
      data.length > 1 ? getValue(data[data.length - 2], keyPath) : 0;

    // This week vs Last week
    const thisWeekData = data.filter(
      (item) =>
        new Date(item.timestamp) >= new Date(now - 7 * 24 * 60 * 60 * 1000)
    );
    const lastWeekData = data.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return (
        itemDate >= new Date(now - 14 * 24 * 60 * 60 * 1000) &&
        itemDate < new Date(now - 7 * 24 * 60 * 60 * 1000)
      );
    });

    const thisWeekAvg =
      thisWeekData.length > 0
        ? thisWeekData.reduce((sum, item) => sum + getValue(item, keyPath), 0) /
          thisWeekData.length
        : 0;
    const lastWeekAvg =
      lastWeekData.length > 0
        ? lastWeekData.reduce((sum, item) => sum + getValue(item, keyPath), 0) /
          lastWeekData.length
        : 0;

    // This month vs Last month
    const thisMonthData = data.filter(
      (item) =>
        new Date(item.timestamp) >= new Date(now - 30 * 24 * 60 * 60 * 1000)
    );
    const lastMonthData = data.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return (
        itemDate >= new Date(now - 60 * 24 * 60 * 60 * 1000) &&
        itemDate < new Date(now - 30 * 24 * 60 * 60 * 1000)
      );
    });

    const thisMonthAvg =
      thisMonthData.length > 0
        ? thisMonthData.reduce(
            (sum, item) => sum + getValue(item, keyPath),
            0
          ) / thisMonthData.length
        : 0;
    const lastMonthAvg =
      lastMonthData.length > 0
        ? lastMonthData.reduce(
            (sum, item) => sum + getValue(item, keyPath),
            0
          ) / lastMonthData.length
        : 0;

    return {
      todayVsYesterday:
        yesterdayValue !== 0
          ? Math.round(((todayValue - yesterdayValue) / yesterdayValue) * 100)
          : null,
      weekVsLastWeek:
        lastWeekAvg !== 0
          ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
          : null,
      monthVsLastMonth:
        lastMonthAvg !== 0
          ? Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100)
          : null,
    };
  };

  const calculateTrends = (data) => {
    const trends = { improving: [], declining: [], stable: [] };

    // Analyze each metric for trends
    const analyzeMetricTrend = (metricData, metricName, keyPath) => {
      if (metricData.length < 3) return;

      const recentValues = metricData.slice(-5).map((item) => {
        const keys = keyPath.split(".");
        let value = keys.reduce((obj, key) => obj?.[key], item);

        if (keyPath.includes("prediction") && typeof value === "string") {
          return value === "addicted" ? 1 : 0;
        }
        if (keyPath.includes("depression_level") && typeof value === "string") {
          const levels = { low: 1, moderate: 2, high: 3, severe: 4 };
          return levels[value?.toLowerCase()] || 0;
        }

        return parseFloat(value) || 0;
      });

      const trend = calculateLinearTrend(recentValues);
      const category =
        trend > 0.1 ? "declining" : trend < -0.1 ? "improving" : "stable";

      trends[category].push({
        metric: metricName,
        trend: trend,
        direction:
          trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable",
      });
    };

    analyzeMetricTrend(data.stress, "Stress Level", "stress_level");
    analyzeMetricTrend(
      data.mental,
      "Mental Health",
      "prediction_results.depression_level"
    );
    analyzeMetricTrend(
      data.mobile,
      "Mobile Usage",
      "prediction_result.prediction"
    );
    analyzeMetricTrend(
      data.academic,
      "Academic Impact",
      "predictions.addiction_score"
    );

    return trends;
  };

  const calculateLinearTrend = (values) => {
    const n = values.length;
    if (n < 2) return 0;

    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  };

  const generateAlerts = (data) => {
    const alerts = [];

    // High stress alert
    const latestStress = data.stress[data.stress.length - 1];
    if (latestStress?.stress_level > 8) {
      alerts.push({
        type: "warning",
        title: "High Stress Level Detected",
        message: `Your stress level is ${latestStress.stress_level}/10. Consider taking a break.`,
        timestamp: new Date(),
      });
    }

    // Mental health alert
    const latestMental = data.mental[data.mental.length - 1];
    if (
      latestMental?.prediction_results?.depression_level === "high" ||
      latestMental?.prediction_results?.depression_level === "severe"
    ) {
      alerts.push({
        type: "critical",
        title: "Mental Health Concern",
        message:
          "Your mental health indicators suggest you may need support. Consider reaching out to a professional.",
        timestamp: new Date(),
      });
    }

    // Mobile addiction alert
    const latestMobile = data.mobile[data.mobile.length - 1];
    if (latestMobile?.prediction_result?.prediction === "addicted") {
      alerts.push({
        type: "info",
        title: "Mobile Usage Alert",
        message:
          "Your mobile usage patterns indicate potential addiction. Try setting usage limits.",
        timestamp: new Date(),
      });
    }

    // Academic performance alert
    const latestAcademic = data.academic[data.academic.length - 1];
    if (latestAcademic?.predictions?.affects_academic_performance === "Yes") {
      alerts.push({
        type: "warning",
        title: "Academic Performance Impact",
        message:
          "Your current habits may be affecting your academic performance.",
        timestamp: new Date(),
      });
    }

    return alerts;
  };

  const calculateSummary = (data) => {
    const totalSessions =
      data.stress.length +
      data.mental.length +
      data.mobile.length +
      data.academic.length;

    const averageStress =
      data.stress.length > 0
        ? data.stress.reduce((sum, item) => sum + (item.stress_level || 0), 0) /
          data.stress.length
        : 0;

    const averageMentalHealth =
      data.mental.length > 0
        ? data.mental.reduce((sum, item) => {
            const level = item.prediction_results?.depression_level;
            const levels = { low: 85, moderate: 65, high: 40, severe: 20 };
            return sum + (levels[level?.toLowerCase()] || 70);
          }, 0) / data.mental.length
        : 70;

    const mobileAddictionCount = data.mobile.filter(
      (item) => item.prediction_result?.prediction === "addicted"
    ).length;
    const mobileUsageStatus =
      mobileAddictionCount > data.mobile.length / 2 ? "high" : "normal";

    const academicImpactCount = data.academic.filter(
      (item) => item.predictions?.affects_academic_performance === "Yes"
    ).length;
    const academicImpact =
      academicImpactCount > data.academic.length / 2 ? "high" : "low";

    return {
      totalSessions,
      averageStress: Math.round(averageStress * 10) / 10,
      averageMentalHealth: Math.round(averageMentalHealth),
      mobileUsageStatus,
      academicImpact,
    };
  };

  const calculateGoalsProgress = (data, summary) => {
    return {
      stressReduction: {
        target: 5,
        current: summary.averageStress,
        progress: Math.max(
          0,
          Math.min(100, ((10 - summary.averageStress) / 5) * 100)
        ),
      },
      mentalWellness: {
        target: 80,
        current: summary.averageMentalHealth,
        progress: Math.max(
          0,
          Math.min(100, (summary.averageMentalHealth / 80) * 100)
        ),
      },
      screenTime: {
        target: 4,
        current: summary.mobileUsageStatus === "high" ? 8 : 3,
        progress: summary.mobileUsageStatus === "high" ? 25 : 75,
      },
    };
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const userId =
        localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
      await fetchAllMetrics(userId);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Mentora-Wellness-Report-${user?.full_name || "User"}-${
      new Date().toISOString().split("T")[0]
    }`,
    onAfterPrint: () => {
      alert("Wellness report has been generated successfully!");
    },
  });

  // Chart configurations
  const stressChartData = {
    labels: metrics.stress.slice(-10).map((item) =>
      new Date(item.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "Stress Level",
        data: metrics.stress.slice(-10).map((item) => item.stress_level),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const mentalHealthChartData = {
    labels: metrics.mental.slice(-10).map((item) =>
      new Date(item.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "Mental Wellness Score",
        data: metrics.mental.slice(-10).map((item) => {
          const level = item.prediction_results?.depression_level;
          const levels = { low: 85, moderate: 65, high: 40, severe: 20 };
          return levels[level?.toLowerCase()] || 70;
        }),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const mobileUsageChartData = {
    labels: ["Normal Usage", "Addictive Usage"],
    datasets: [
      {
        label: "Mobile Usage Distribution",
        data: [
          metrics.mobile.filter(
            (item) =>
              item.prediction_result?.prediction !== "addicted" ||
              item.prediction_result?.Addiction_Status !== "addicted"
          ).length,
          metrics.mobile.filter(
            (item) =>
              item.prediction_result?.prediction === "addicted" ||
              item.prediction_result?.Addiction_Status === "addicted"
          ).length,
        ],
        backgroundColor: ["rgba(75, 192, 192, 0.8)", "rgba(255, 159, 64, 0.8)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const overallWellnessRadarData = {
    labels: [
      "Stress Management",
      "Mental Health",
      "Digital Wellness",
      "Academic Performance",
      "Overall Balance",
    ],
    datasets: [
      {
        label: "Current Status",
        data: [
          Math.max(0, 10 - (metrics.summary.averageStress || 0)),
          (metrics.summary.averageMentalHealth || 0) / 10,
          metrics.summary.mobileUsageStatus === "normal" ? 8 : 4,
          metrics.summary.academicImpact === "low" ? 8 : 4,
          (metrics.goals.stressReduction.progress +
            metrics.goals.mentalWellness.progress +
            metrics.goals.screenTime.progress) /
            30,
        ],
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        borderColor: "rgba(153, 102, 255, 1)",
        pointBackgroundColor: "rgba(153, 102, 255, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(153, 102, 255, 1)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
      },
    },
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-content">
            <h3>Loading Dashboard</h3>
            <p>Fetching your wellness data...</p>
            <div className="loading-steps">
              <div className="step active">Authenticating user</div>
              <div className="step active">Loading stress metrics</div>
              <div className="step active">Loading mental health data</div>
              <div className="step">Processing analytics</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Dashboard Error</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="welcome-section">
              <h1>Welcome back, {user?.full_name}!</h1>
              <p className="last-updated">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            </div>

            <div className="header-controls">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="date-range-selector"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>

              <button
                onClick={refreshData}
                disabled={refreshing}
                className="refresh-button"
              >
                {refreshing ? "↻" : "🔄"} Refresh
              </button>

              <button onClick={handlePrint} className="report-button">
                📊 Generate Report
              </button>
            </div>
          </div>

          {/* Streak and Progress */}
          <div className="progress-section">
            <div className="streak-container">
              <div className="streak-badge">
                <span className="streak-number">
                  {user?.current_streak || 0}
                </span>
                <span className="streak-label">Day Streak</span>
              </div>
            </div>

            <div className="goals-overview">
              <div className="goal-item">
                <span>Stress Management</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill stress"
                    style={{
                      width: `${metrics.goals.stressReduction.progress}%`,
                    }}
                  ></div>
                </div>
                <span>
                  {Math.round(metrics.goals.stressReduction.progress)}%
                </span>
              </div>

              <div className="goal-item">
                <span>Mental Wellness</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill mental"
                    style={{
                      width: `${metrics.goals.mentalWellness.progress}%`,
                    }}
                  ></div>
                </div>
                <span>
                  {Math.round(metrics.goals.mentalWellness.progress)}%
                </span>
              </div>

              <div className="goal-item">
                <span>Screen Time</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill screen"
                    style={{ width: `${metrics.goals.screenTime.progress}%` }}
                  ></div>
                </div>
                <span>{Math.round(metrics.goals.screenTime.progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {metrics.alerts.length > 0 && (
          <div className="alerts-section">
            <h3>🚨 Attention Required</h3>
            <div className="alerts-grid">
              {metrics.alerts.map((alert, index) => (
                <div key={index} className={`alert alert-${alert.type}`}>
                  <div className="alert-header">
                    <strong>{alert.title}</strong>
                    <span className="alert-time">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="metrics-overview">
          <h2>📊 Current Status</h2>
          <div className="metrics-grid">
            <div className="metric-card stress-card">
              <div className="metric-header">
                <h3>Stress Level</h3>
                <span className="metric-icon">😰</span>
              </div>
              <div className="metric-value">
                <span className="value">
                  {metrics.stress[
                    metrics.stress.length - 1
                  ]?.stress_level?.toFixed(1) || "N/A"}
                </span>
                <span className="unit">/10</span>
              </div>
              <div className="metric-change">
                {metrics.comparisons.stress.todayVsYesterday !== null && (
                  <span
                    className={
                      metrics.comparisons.stress.todayVsYesterday > 0
                        ? "negative"
                        : "positive"
                    }
                  >
                    {metrics.comparisons.stress.todayVsYesterday > 0
                      ? "↑"
                      : "↓"}
                    {Math.abs(metrics.comparisons.stress.todayVsYesterday)}% vs
                    yesterday
                  </span>
                )}
              </div>
              <div className="metric-trend">
                <small>
                  Weekly:{" "}
                  {metrics.comparisons.stress.weekVsLastWeek !== null
                    ? `${
                        metrics.comparisons.stress.weekVsLastWeek > 0 ? "+" : ""
                      }${metrics.comparisons.stress.weekVsLastWeek}%`
                    : "No data"}
                </small>
              </div>
            </div>

            <div className="metric-card mental-card">
              <div className="metric-header">
                <h3>Mental Wellness</h3>
                <span className="metric-icon">🧠</span>
              </div>
              <div className="metric-value">
                <span className="value">
                  {metrics.summary.averageMentalHealth}
                </span>
                <span className="unit">%</span>
              </div>
              <div className="metric-status">
                {metrics.mental[metrics.mental.length - 1]?.prediction_results
                  ?.depression_level || "Normal"}
              </div>
              <div className="metric-trend">
                <small>
                  Weekly:{" "}
                  {metrics.comparisons.mental.weekVsLastWeek !== null
                    ? `${
                        metrics.comparisons.mental.weekVsLastWeek > 0 ? "+" : ""
                      }${metrics.comparisons.mental.weekVsLastWeek}%`
                    : "No data"}
                </small>
              </div>
            </div>

            <div className="metric-card mobile-card">
              <div className="metric-header">
                <h3>Digital Wellness</h3>
                <span className="metric-icon">📱</span>
              </div>
              <div className="metric-value">
                <span className="status-badge">
                  {metrics.summary.mobileUsageStatus === "high"
                    ? "High Usage"
                    : "Healthy"}
                </span>
              </div>
              <div className="metric-stats">
                Addiction Risk:{" "}
                {
                  metrics.mobile.filter(
                    (item) => item.prediction_result?.prediction === "addicted"
                  ).length
                }{" "}
                sessions
              </div>
              <div className="metric-trend">
                <small>Total sessions: {metrics.mobile.length}</small>
              </div>
            </div>

            <div className="metric-card academic-card">
              <div className="metric-header">
                <h3>Academic Impact</h3>
                <span className="metric-icon">🎓</span>
              </div>
              <div className="metric-value">
                <span className="status-badge">
                  {metrics.summary.academicImpact === "high"
                    ? "High Impact"
                    : "Low Impact"}
                </span>
              </div>
              <div className="metric-stats">
                Affected Sessions:{" "}
                {
                  metrics.academic.filter(
                    (item) =>
                      item.predictions?.affects_academic_performance === "Yes"
                  ).length
                }
              </div>
              <div className="metric-trend">
                <small>Total assessments: {metrics.academic.length}</small>
              </div>
            </div>

            <div className="metric-card summary-card">
              <div className="metric-header">
                <h3>Overall Summary</h3>
                <span className="metric-icon">📈</span>
              </div>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Sessions</span>
                  <span className="stat-value">
                    {metrics.summary.totalSessions}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Active Days</span>
                  <span className="stat-value">
                    {user?.current_streak || 0}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Wellness</span>
                  <span className="stat-value">
                    {Math.round(
                      (metrics.goals.stressReduction.progress +
                        metrics.goals.mentalWellness.progress +
                        metrics.goals.screenTime.progress) /
                        3
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Charts Section */}
        <div className="charts-section">
          <h2>📈 Detailed Analytics</h2>

          <div className="charts-grid">
            <div className="chart-container">
              <div className="chart-header">
                <h3>Stress Levels Trend</h3>
                <div className="chart-controls">
                  <button className="chart-btn active">Line</button>
                  <button className="chart-btn">Bar</button>
                </div>
              </div>
              <div className="chart-wrapper">
                <Line data={stressChartData} options={chartOptions} />
              </div>
              <div className="chart-insights">
                <p>
                  <strong>Insight:</strong>
                  {metrics.trends.stress?.direction === "decreasing"
                    ? " Your stress levels are improving! 🎉"
                    : metrics.trends.stress?.direction === "increasing"
                    ? " Your stress levels need attention. Consider stress management techniques."
                    : " Your stress levels are stable."}
                </p>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <h3>Mental Wellness Score</h3>
                <div className="chart-info">
                  <span className="info-icon">ℹ️</span>
                  <div className="tooltip">
                    Higher scores indicate better mental health
                  </div>
                </div>
              </div>
              <div className="chart-wrapper">
                <Line
                  data={mentalHealthChartData}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function (value) {
                            return value + "%";
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="chart-insights">
                <p>
                  <strong>Current Status:</strong>
                  {metrics.summary.averageMentalHealth >= 80
                    ? " Excellent mental health! 🌟"
                    : metrics.summary.averageMentalHealth >= 60
                    ? " Good mental health, keep it up! 👍"
                    : " Consider focusing on mental wellness activities. 🧘‍♀️"}
                </p>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <h3>Mobile Usage Pattern</h3>
                <div className="usage-summary">
                  <span className="usage-stat">
                    {metrics.mobile.length > 0
                      ? (
                          (metrics.mobile.filter(
                            (item) =>
                              item.prediction_result?.prediction ===
                                "addicted" ||
                              item.prediction_result?.Addiction_Status ===
                                "addicted"
                          ).length /
                            metrics.mobile.length) *
                          100
                        ).toFixed(1)
                      : 0}
                    % addiction risk
                  </span>
                </div>
              </div>
              <div className="chart-wrapper">
                {metrics.mobile.length > 0 ? (
                  <Doughnut
                    data={mobileUsageChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "bottom" },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.raw} sessions`,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="no-data-message">
                    <p>No mobile usage data available</p>
                  </div>
                )}
              </div>
              <div className="chart-insights">
                <p>
                  <strong>Recommendation:</strong>
                  {metrics.summary.mobileUsageStatus === "high"
                    ? " Consider setting daily usage limits and using focus modes. 📵"
                    : " Great job maintaining healthy mobile usage! 📱✅"}
                </p>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <h3>Overall Wellness Radar</h3>
                <div className="radar-legend">
                  <small>Comprehensive view of all wellness dimensions</small>
                </div>
              </div>
              <div className="chart-wrapper">
                <Radar
                  data={overallWellnessRadarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                          stepSize: 2,
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="chart-insights">
                <p>
                  <strong>Focus Areas:</strong>
                  {metrics.trends.declining.length > 0
                    ? ` Work on ${metrics.trends.declining
                        .map((t) => t.metric)
                        .join(", ")}`
                    : " You're doing well across all areas! 🎯"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Analysis */}
        <div className="trends-section">
          <h2>📊 Trend Analysis</h2>
          <div className="trends-grid">
            <div className="trend-card improving">
              <div className="trend-header">
                <h3>🟢 Improving Areas</h3>
                <span className="trend-count">
                  {metrics.trends.improving.length}
                </span>
              </div>
              <div className="trend-list">
                {metrics.trends.improving.length > 0 ? (
                  metrics.trends.improving.map((trend, index) => (
                    <div key={index} className="trend-item">
                      <span className="trend-metric">{trend.metric}</span>
                      <span className="trend-direction">↗️ Improving</span>
                    </div>
                  ))
                ) : (
                  <p className="no-trends">No improving trends detected</p>
                )}
              </div>
            </div>

            <div className="trend-card declining">
              <div className="trend-header">
                <h3>🔴 Areas Needing Attention</h3>
                <span className="trend-count">
                  {metrics.trends.declining.length}
                </span>
              </div>
              <div className="trend-list">
                {metrics.trends.declining.length > 0 ? (
                  metrics.trends.declining.map((trend, index) => (
                    <div key={index} className="trend-item">
                      <span className="trend-metric">{trend.metric}</span>
                      <span className="trend-direction">↘️ Needs Focus</span>
                    </div>
                  ))
                ) : (
                  <p className="no-trends">
                    No declining trends - great job! 🎉
                  </p>
                )}
              </div>
            </div>

            <div className="trend-card stable">
              <div className="trend-header">
                <h3>🟡 Stable Areas</h3>
                <span className="trend-count">
                  {metrics.trends.stable.length}
                </span>
              </div>
              <div className="trend-list">
                {metrics.trends.stable.length > 0 ? (
                  metrics.trends.stable.map((trend, index) => (
                    <div key={index} className="trend-item">
                      <span className="trend-metric">{trend.metric}</span>
                      <span className="trend-direction">➡️ Stable</span>
                    </div>
                  ))
                ) : (
                  <p className="no-trends">No stable trends</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div className="recommendations-section">
          <h2>💡 Personalized Recommendations</h2>
          <div className="recommendations-grid">
            {/* Stress Management */}
            <div className="recommendation-card">
              <div className="rec-header">
                <h3>😌 Stress Management</h3>
                <div className="priority-badge high">High Priority</div>
              </div>
              <div className="rec-content">
                <ul>
                  {metrics.summary.averageStress > 7 && (
                    <li>🧘‍♀️ Practice 10-minute daily meditation</li>
                  )}
                  {metrics.summary.averageStress > 5 && (
                    <li>🚶‍♂️ Take regular breaks during work</li>
                  )}
                  <li>😴 Maintain consistent sleep schedule</li>
                  <li>🎵 Try relaxing music or nature sounds</li>
                </ul>
              </div>
            </div>

            {/* Mental Health */}
            <div className="recommendation-card">
              <div className="rec-header">
                <h3>🧠 Mental Wellness</h3>
                <div className="priority-badge medium">Medium Priority</div>
              </div>
              <div className="rec-content">
                <ul>
                  {metrics.summary.averageMentalHealth < 60 && (
                    <li>👥 Connect with friends and family</li>
                  )}
                  <li>📝 Keep a gratitude journal</li>
                  <li>🌅 Get morning sunlight exposure</li>
                  <li>🏃‍♀️ Engage in regular physical activity</li>
                </ul>
              </div>
            </div>

            {/* Digital Wellness */}
            <div className="recommendation-card">
              <div className="rec-header">
                <h3>📱 Digital Wellness</h3>
                <div
                  className={`priority-badge ${
                    metrics.summary.mobileUsageStatus === "high"
                      ? "high"
                      : "low"
                  }`}
                >
                  {metrics.summary.mobileUsageStatus === "high"
                    ? "High Priority"
                    : "Low Priority"}
                </div>
              </div>
              <div className="rec-content">
                <ul>
                  {metrics.summary.mobileUsageStatus === "high" && (
                    <>
                      <li>⏰ Set daily app usage limits</li>
                      <li>📵 Create phone-free zones</li>
                    </>
                  )}
                  <li>🌙 Use night mode after 8 PM</li>
                  <li>🔔 Disable non-essential notifications</li>
                </ul>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="recommendation-card">
              <div className="rec-header">
                <h3>🎓 Academic Success</h3>
                <div
                  className={`priority-badge ${
                    metrics.summary.academicImpact === "high" ? "high" : "low"
                  }`}
                >
                  {metrics.summary.academicImpact === "high"
                    ? "High Priority"
                    : "Low Priority"}
                </div>
              </div>
              <div className="rec-content">
                <ul>
                  {metrics.summary.academicImpact === "high" && (
                    <>
                      <li>📚 Create dedicated study space</li>
                      <li>⏳ Use Pomodoro technique</li>
                    </>
                  )}
                  <li>📅 Plan study sessions in advance</li>
                  <li>🎯 Set specific, achievable goals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Goals and Progress */}
        <div className="goals-section">
          <h2>🎯 Your Wellness Goals</h2>
          <div className="goals-grid">
            <div className="goal-card">
              <div className="goal-header">
                <h3>Stress Reduction Goal</h3>
                <span className="goal-target">Target: ≤ 5/10</span>
              </div>
              <div className="goal-progress">
                <div className="progress-circle">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#4CAF50 ${
                        metrics.goals.stressReduction.progress * 3.6
                      }deg, #e0e0e0 0deg)`,
                    }}
                  >
                    <div className="progress-inner">
                      <span className="progress-percent">
                        {Math.round(metrics.goals.stressReduction.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="goal-details">
                  <p>Current: {metrics.goals.stressReduction.current}/10</p>
                  <p>Target: {metrics.goals.stressReduction.target}/10</p>
                </div>
              </div>
            </div>

            <div className="goal-card">
              <div className="goal-header">
                <h3>Mental Wellness Goal</h3>
                <span className="goal-target">Target: ≥ 80%</span>
              </div>
              <div className="goal-progress">
                <div className="progress-circle">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#2196F3 ${
                        metrics.goals.mentalWellness.progress * 3.6
                      }deg, #e0e0e0 0deg)`,
                    }}
                  >
                    <div className="progress-inner">
                      <span className="progress-percent">
                        {Math.round(metrics.goals.mentalWellness.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="goal-details">
                  <p>Current: {metrics.goals.mentalWellness.current}%</p>
                  <p>Target: {metrics.goals.mentalWellness.target}%</p>
                </div>
              </div>
            </div>

            <div className="goal-card">
              <div className="goal-header">
                <h3>Screen Time Goal</h3>
                <span className="goal-target">Target: ≤ 4h/day</span>
              </div>
              <div className="goal-progress">
                <div className="progress-circle">
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#FF9800 ${
                        metrics.goals.screenTime.progress * 3.6
                      }deg, #e0e0e0 0deg)`,
                    }}
                  >
                    <div className="progress-inner">
                      <span className="progress-percent">
                        {Math.round(metrics.goals.screenTime.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="goal-details">
                  <p>Current: {metrics.goals.screenTime.current}h</p>
                  <p>Target: {metrics.goals.screenTime.target}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2>⚡ Quick Actions</h2>
          <div className="actions-grid">
            <button
              className="action-btn stress-assessment"
              onClick={() => navigate("/stress-assessment")}
            >
              <span className="action-icon">😰</span>
              <span className="action-text">Stress Check</span>
            </button>

            <button
              className="action-btn mental-health"
              onClick={() => navigate("/mental-health")}
            >
              <span className="action-icon">🧠</span>
              <span className="action-text">Mental Health</span>
            </button>

            <button
              className="action-btn mobile-usage"
              onClick={() => navigate("/mobile-usage")}
            >
              <span className="action-icon">📱</span>
              <span className="action-text">Mobile Check</span>
            </button>

            <button
              className="action-btn academic"
              onClick={() => navigate("/academic")}
            >
              <span className="action-icon">🎓</span>
              <span className="action-text">Academic</span>
            </button>

            <button
              className="action-btn meditation"
              onClick={() => navigate("/meditation")}
            >
              <span className="action-icon">🧘‍♀️</span>
              <span className="action-text">Meditation</span>
            </button>

            <button
              className="action-btn settings"
              onClick={() => navigate("/settings")}
            >
              <span className="action-icon">⚙️</span>
              <span className="action-text">Settings</span>
            </button>
          </div>
        </div>

        {/* Report Section - Hidden but printable */}
        <div
          ref={componentRef}
          className="report-section"
          style={{ display: "none" }}
        >
          <div className="report-header">
            <h1>Mentora Wellness Report</h1>
            <div className="report-info">
              <p>
                <strong>User:</strong> {user?.full_name}
              </p>
              <p>
                <strong>Generated:</strong> {new Date().toLocaleString()}
              </p>
              <p>
                <strong>Period:</strong>{" "}
                {dateRange === "7days"
                  ? "Last 7 Days"
                  : dateRange === "30days"
                  ? "Last 30 Days"
                  : "Last 90 Days"}
              </p>
            </div>
          </div>

          <div className="report-summary">
            <h2>Executive Summary</h2>
            <div className="summary-metrics">
              <div className="summary-item">
                <strong>Total Sessions:</strong> {metrics.summary.totalSessions}
              </div>
              <div className="summary-item">
                <strong>Average Stress Level:</strong>{" "}
                {metrics.summary.averageStress}/10
              </div>
              <div className="summary-item">
                <strong>Mental Wellness Score:</strong>{" "}
                {metrics.summary.averageMentalHealth}%
              </div>
              <div className="summary-item">
                <strong>Digital Wellness Status:</strong>{" "}
                {metrics.summary.mobileUsageStatus}
              </div>
              <div className="summary-item">
                <strong>Academic Impact:</strong>{" "}
                {metrics.summary.academicImpact}
              </div>
            </div>
          </div>

          <div className="report-trends">
            <h2>Key Trends</h2>
            <div className="trends-summary">
              <div className="trend-section">
                <h3>Improving Areas:</h3>
                <ul>
                  {metrics.trends.improving.map((trend, index) => (
                    <li key={index}>
                      {trend.metric} - {trend.direction}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="trend-section">
                <h3>Areas Needing Attention:</h3>
                <ul>
                  {metrics.trends.declining.map((trend, index) => (
                    <li key={index}>
                      {trend.metric} - {trend.direction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="report-recommendations">
            <h2>Recommendations</h2>
            <div className="recommendations-list">
              <h3>Immediate Actions:</h3>
              <ul>
                {metrics.summary.averageStress > 7 && (
                  <li>Focus on stress reduction techniques</li>
                )}
                {metrics.summary.averageMentalHealth < 60 && (
                  <li>Prioritize mental health support</li>
                )}
                {metrics.summary.mobileUsageStatus === "high" && (
                  <li>Implement digital wellness strategies</li>
                )}
                {metrics.summary.academicImpact === "high" && (
                  <li>Address academic performance factors</li>
                )}
              </ul>
            </div>
          </div>

          <div className="report-footer">
            <p>
              <em>
                This report is generated by Mentora AI and should be used as a
                guide for wellness improvement. Consult healthcare professionals
                for serious concerns.
              </em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
