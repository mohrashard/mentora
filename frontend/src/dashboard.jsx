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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

// Utility function to determine usage status
const getUsageStatus = (value, thresholds) => {
  if (value < thresholds.low) return "Low";
  if (value < thresholds.moderate) return "Moderate";
  return "High";
};

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
      socialMediaUsage: { todayVsYesterday: null },
      nightUsage: { todayVsYesterday: null },
      workStudyHours: { todayVsYesterday: null },
    },
    trends: { improving: [], declining: [], stable: [] },
    alerts: [],
    summary: {
      totalSessions: 0,
      averageStress: 0,
      averageMentalHealth: 0,
      mobileUsageStatus: "normal",
      academicImpact: "low",
      screenTimeAverage: 0,
      nonAddictivePercentage: 0,
      academicPerformancePercentage: 0,
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
        if (data?.mobile_usage_history) return data.mobile_usage_history;
        console.warn("Unexpected API response structure:", data);
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

        const userRes = await fetch(`http://localhost:5000/user/${userId}`);
        if (!userRes.ok) throw new Error("User verification failed");
        const userData = await userRes.json();
        setUser(userData);

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
    const daysMap = { "24hours": 1, "7days": 7, "30days": 30 };
    const days = daysMap[dateRange] || 7;

    const filterByDateRange = (items) =>
      items.filter((item) => {
        const itemDate = new Date(
          item.timestamp || item.created_at || Date.now()
        );
        if (isNaN(itemDate)) {
          console.warn("Invalid timestamp in item:", item);
          return false;
        }
        const cutoffDate = new Date(now - days * 24 * 60 * 60 * 1000);
        return itemDate >= cutoffDate;
      });

    const filteredData = {
      stress: filterByDateRange(data.stress),
      mental: filterByDateRange(data.mental),
      mobile: filterByDateRange(data.mobile),
      academic: filterByDateRange(data.academic),
    };

    const comparisons = {
      stress: calculateAdvancedComparisons(filteredData.stress, "stress_level"),
      mental: calculateAdvancedComparisons(
        filteredData.mental,
        "prediction_results.mental_health_status"
      ),
      mobile: calculateAdvancedComparisons(
        filteredData.mobile,
        "prediction_result.prediction"
      ),
      academic: calculateAdvancedComparisons(
        filteredData.academic,
        "predictions.addiction_score"
      ),
      socialMediaUsage: calculateAdvancedComparisons(
        filteredData.mobile,
        "input_data.social_media_usage"
      ),
      nightUsage: calculateAdvancedComparisons(
        filteredData.mobile,
        "input_data.night_usage"
      ),
      workStudyHours: calculateAdvancedComparisons(
        filteredData.mobile,
        "input_data.work_study_hours"
      ),
    };

    const trends = calculateTrends(filteredData);
    const alerts = generateAlerts(filteredData, comparisons);
    const summary = calculateSummary(filteredData);
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
    if (!data || data.length === 0) {
      return {
        todayVsYesterday: null,
        weekVsLastWeek: null,
        monthVsLastMonth: null,
      };
    }

    const now = new Date();
    const getValue = (item, path) => {
      const keys = path.split(".");
      let value = keys.reduce((obj, key) => obj?.[key], item);
      if (path === "input_data.social_media_usage") {
        return parseFloat(value) || 0;
      }
      if (path === "input_data.night_usage") {
        return parseFloat(value) || 0;
      }
      if (path === "input_data.work_study_hours") {
        return parseFloat(value) || 0;
      }
      if (path === "prediction_results.mental_health_status") {
        const statusScores = { Good: 90, Fair: 70, "At Risk": 50, Poor: 30 };
        return statusScores[value] || 70;
      } else if (path === "prediction_result.prediction") {
        return value === "addicted" ? 1 : 0;
      } else {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? 0 : parsedValue;
      }
    };

    const todayValue = data.length > 0 ? getValue(data[0], keyPath) : 0;
    const yesterdayValue = data.length > 1 ? getValue(data[1], keyPath) : 0;

    const thisWeekData = data.filter(
      (item) =>
        new Date(item.timestamp || item.created_at) >=
        new Date(now - 7 * 24 * 60 * 60 * 1000)
    );
    const lastWeekData = data.filter((item) => {
      const itemDate = new Date(item.timestamp || item.created_at);
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

    const thisMonthData = data.filter(
      (item) =>
        new Date(item.timestamp || item.created_at) >=
        new Date(now - 30 * 24 * 60 * 60 * 1000)
    );
    const lastMonthData = data.filter((item) => {
      const itemDate = new Date(item.timestamp || item.created_at);
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
          : 0,
      weekVsLastWeek:
        lastWeekAvg !== 0
          ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
          : 0,
      monthVsLastMonth:
        lastMonthAvg !== 0
          ? Math.round(((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100)
          : 0,
    };
  };

  const calculateTrends = (data) => {
    const trends = { improving: [], declining: [], stable: [] };

    const analyzeMetricTrend = (metricData, metricName, keyPath) => {
      if (metricData.length < 3) return;

      const getMetricValue = (item, path) => {
        const keys = path.split(".");
        let value = keys.reduce((obj, key) => obj?.[key], item);

        if (path === "prediction_results.mental_health_status") {
          const statusScores = { Good: 90, Fair: 70, "At Risk": 50, Poor: 30 };
          return statusScores[value] || 70;
        } else if (path === "prediction_results.depression_level") {
          const levels = { Low: 1, Moderate: 2, High: 3, Severe: 4 };
          return levels[value] || 0;
        } else if (path.includes("prediction") && typeof value === "string") {
          return value === "addicted" ? 1 : 0;
        } else {
          return parseFloat(value) || 0;
        }
      };

      const recentValues = metricData
        .slice(-5)
        .map((item) => getMetricValue(item, keyPath));
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
      "prediction_results.mental_health_status"
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

  const generateAlerts = (data, comparisons) => {
    const alerts = [];
    const latestStress = data.stress[data.stress.length - 1];

    if (latestStress?.stress_level > 8) {
      alerts.push({
        type: "warning",
        title: "High Stress Level Detected",
        message: `Your stress level is ${latestStress.stress_level}/10. Consider taking a break.`,
        timestamp: new Date(),
      });
    }

    const latestMental = data.mental[0];
    if (latestMental) {
      if (
        ["High", "Severe"].includes(
          latestMental.prediction_results?.depression_level
        )
      ) {
        alerts.push({
          type: "critical",
          title: "Mental Health Concern",
          message:
            "Your mental health indicators suggest you may need support.",
          timestamp: new Date(),
        });
      }

      if (latestMental.input_data?.Caffeine_Intake_mg_per_day > 400) {
        alerts.push({
          type: "warning",
          title: "High Caffeine Intake",
          message: `Your caffeine intake is ${latestMental.input_data.Caffeine_Intake_mg_per_day}mg - consider reducing.`,
          timestamp: new Date(),
        });
      }
    }

    const latestMobile = data.mobile[data.mobile.length - 1];
    if (latestMobile?.prediction_result?.prediction === "addicted") {
      alerts.push({
        type: "info",
        title: "Mobile Usage Alert",
        message: "Your mobile usage patterns indicate potential addiction.",
        timestamp: new Date(),
      });
    }

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

    if (comparisons.stress.weekVsLastWeek < -10) {
      alerts.push({
        type: "positive",
        title: "Stress Management",
        message: "Great job! Your stress levels are lower than last week.",
        timestamp: new Date(),
      });
    }
    if (comparisons.mental.weekVsLastWeek > 10) {
      alerts.push({
        type: "positive",
        title: "Mental Wellness",
        message: "Excellent! Your mental wellness is better than last week.",
        timestamp: new Date(),
      });
    }
    if (comparisons.mobile.weekVsLastWeek < -10) {
      alerts.push({
        type: "positive",
        title: "Digital Wellness",
        message:
          "Well done! You're maintaining your screen time better than last week.",
        timestamp: new Date(),
      });
    }
    if (comparisons.academic.weekVsLastWeek < -10) {
      alerts.push({
        type: "positive",
        title: "Academic Performance",
        message:
          "Great improvement! Your academic impact is lower than last week.",
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

    const mentalScores = data.mental.map((item) => {
      const status = item.prediction_results?.mental_health_status;
      return mentalHealthStatusScores[status] || 70;
    });
    const averageMentalHealth =
      mentalScores.length > 0
        ? mentalScores.reduce((sum, score) => sum + score, 0) /
          mentalScores.length
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

    const totalScreenTime = (item) =>
      (item.input_data?.social_media_usage || 0) +
      (item.input_data?.night_usage || 0) +
      (item.input_data?.work_study_hours || 0);

    const screenTimeAverage =
      data.mobile.length > 0
        ? data.mobile.reduce((sum, item) => sum + totalScreenTime(item), 0) /
          data.mobile.length
        : 0;

    const nonAddictiveSessions = data.mobile.filter(
      (item) => item.prediction_result?.prediction !== "addicted"
    ).length;
    const nonAddictivePercentage =
      data.mobile.length > 0
        ? (nonAddictiveSessions / data.mobile.length) * 100
        : 0;

    const academicNotAffected = data.academic.filter(
      (item) => item.predictions?.affects_academic_performance === "No"
    ).length;
    const academicPerformancePercentage =
      data.academic.length > 0
        ? (academicNotAffected / data.academic.length) * 100
        : 0;

    return {
      totalSessions,
      averageStress: Math.round(averageStress * 10) / 10,
      averageMentalHealth: Math.round(averageMentalHealth),
      mobileUsageStatus,
      academicImpact,
      screenTimeAverage: Math.round(screenTimeAverage * 10) / 10,
      nonAddictivePercentage: Math.round(nonAddictivePercentage),
      academicPerformancePercentage: Math.round(academicPerformancePercentage),
    };
  };

  const calculateGoalsProgress = (data, summary) => {
    const stressTarget = 5;
    const mentalTarget = 80;
    const screenTimeTarget = 4;

    const stressCurrent = summary.averageStress;
    const mentalCurrent = summary.averageMentalHealth;
    const screenTimeCurrent = summary.screenTimeAverage;

    const stressProgress =
      stressCurrent <= stressTarget
        ? 100
        : Math.max(0, ((10 - stressCurrent) / (10 - stressTarget)) * 100);

    const mentalProgress = Math.min(100, (mentalCurrent / mentalTarget) * 100);

    const screenTimeProgress =
      screenTimeCurrent <= screenTimeTarget
        ? 100
        : Math.max(0, (screenTimeTarget / screenTimeCurrent) * 100);

    return {
      stressReduction: {
        target: stressTarget,
        current: stressCurrent,
        progress: Math.round(stressProgress),
      },
      mentalWellness: {
        target: mentalTarget,
        current: mentalCurrent,
        progress: Math.round(mentalProgress),
      },
      screenTime: {
        target: screenTimeTarget,
        current: screenTimeCurrent,
        progress: Math.round(screenTimeProgress),
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

  const generateReport = async () => {
    const input = componentRef.current;
    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Mentora-Report-${user?.full_name}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const mentalHealthStatusScores = {
    Good: 90,
    Fair: 70,
    "At Risk": 50,
    Poor: 30,
  };
  const depressionLevelMapping = { Low: 1, Moderate: 2, High: 3, Severe: 4 };

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
    labels: metrics.mental
      .slice(0, 10)
      .map((item) =>
        new Date(item.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Mental Wellness Score",
        data: metrics.mental
          .slice(0, 10)
          .map(
            (item) =>
              mentalHealthStatusScores[
                item.prediction_results?.mental_health_status
              ] || 70
          )
          .reverse(),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const depressionChartData = {
    labels: metrics.mental
      .slice(0, 10)
      .map((item) =>
        new Date(item.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Depression Level",
        data: metrics.mental
          .slice(0, 10)
          .map(
            (item) =>
              depressionLevelMapping[
                item.prediction_results?.depression_level
              ] || 0
          )
          .reverse(),
        borderColor: "rgb(255, 159, 64)",
        backgroundColor: "rgba(255, 159, 64, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const caffeineChartData = {
    labels: metrics.mental
      .slice(0, 10)
      .map((item) =>
        new Date(item.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Caffeine Intake (mg)",
        data: metrics.mental
          .slice(0, 10)
          .map((item) => item.input_data?.Caffeine_Intake_mg_per_day || 0)
          .reverse(),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
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
            (item) => item.prediction_result?.prediction !== "addicted"
          ).length,
          metrics.mobile.filter(
            (item) => item.prediction_result?.prediction === "addicted"
          ).length,
        ],
        backgroundColor: ["rgba(75, 192, 192, 0.8)", "rgba(255, 159, 64, 0.8)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 159, 64, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const socialMediaChartData = {
    labels: metrics.mobile
      .slice(0, 10)
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Social Media Usage (hours)",
        data: metrics.mobile
          .slice(0, 10)
          .map((item) => item.input_data?.social_media_usage || 0)
          .reverse(),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const nightUsageChartData = {
    labels: metrics.mobile
      .slice(0, 10)
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Night Usage (hours)",
        data: metrics.mobile
          .slice(0, 10)
          .map((item) => item.input_data?.night_usage || 0)
          .reverse(),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const workStudyHoursChartData = {
    labels: metrics.mobile
      .slice(0, 10)
      .map((item) =>
        new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      )
      .reverse(),
    datasets: [
      {
        label: "Work/Study Hours",
        data: metrics.mobile
          .slice(0, 10)
          .map((item) => item.input_data?.work_study_hours || 0)
          .reverse(),
        backgroundColor: "rgba(75, 192, 192, 0.8)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const radarData = [
    Math.max(0, 10 - (metrics.summary.averageStress || 0)),
    (metrics.summary.averageMentalHealth || 0) / 10,
    (metrics.summary.nonAddictivePercentage || 0) / 10,
    (metrics.summary.academicPerformancePercentage || 0) / 10,
  ];

  const overallBalance =
    radarData.length > 0
      ? radarData.reduce((sum, val) => sum + val, 0) / radarData.length
      : 0;

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
        data: [...radarData, overallBalance],
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
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: { y: { beginAtZero: true, max: 10 } },
  };

  const chartOptionsWithUnits = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Hours" },
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

  const latestMental = metrics.mental[metrics.mental.length - 1];
  const latestMobile = metrics.mobile[0];

  const metricDirections = {
    stress: "lower",
    mental: "higher",
    mobile: "lower",
    academic: "lower",
  };

  const getComparisonText = (metric, comparisonValue, period = "yesterday") => {
    if (comparisonValue === null || isNaN(comparisonValue))
      return "Not enough data";
    const direction = metricDirections[metric];
    const absValue = Math.abs(comparisonValue);
    if (comparisonValue === 0) return `Same as ${period}`;
    if (direction === "lower") {
      if (comparisonValue < 0) {
        return `Better than ${period} by ${absValue}%`;
      } else {
        return `Worse than ${period} by ${absValue}%`;
      }
    } else {
      if (comparisonValue > 0) {
        return `Better than ${period} by ${absValue}%`;
      } else {
        return `Worse than ${period} by ${absValue}%`;
      }
    }
  };

  const getComparisonClass = (metric, comparisonValue) => {
    if (
      comparisonValue === null ||
      comparisonValue === 0 ||
      isNaN(comparisonValue)
    )
      return "";
    const direction = metricDirections[metric];
    return direction === "lower"
      ? comparisonValue < 0
        ? "positive"
        : "negative"
      : comparisonValue > 0
      ? "positive"
      : "negative";
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
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
                <option value="24hours">Last 24 Hours</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="refresh-button"
              >
                {refreshing ? "↻" : "🔄"} Refresh
              </button>
              <button onClick={generateReport} className="report-button">
                📊 Print Report
              </button>
            </div>
          </div>

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
                      className={getComparisonClass(
                        "stress",
                        metrics.comparisons.stress.todayVsYesterday
                      )}
                    >
                      {getComparisonText(
                        "stress",
                        metrics.comparisons.stress.todayVsYesterday,
                        "yesterday"
                      )}
                    </span>
                  )}
                </div>
                <div className="metric-trend">
                  <small>
                    Weekly:{" "}
                    {metrics.comparisons.stress.weekVsLastWeek !== null &&
                    !isNaN(metrics.comparisons.stress.weekVsLastWeek)
                      ? `${
                          metrics.comparisons.stress.weekVsLastWeek > 0
                            ? "+"
                            : ""
                        }${metrics.comparisons.stress.weekVsLastWeek}%`
                      : "Not enough data for weekly comparison"}
                  </small>
                </div>
              </div>

              <div className="metric-card mental-card">
                <div className="metric-header">
                  <h3>Mental Wellness</h3>
                  <span className="metric-icon">🧠</span>
                </div>
                <div className="metric-value">
                  {metrics.mental.length > 0 ? (
                    <>
                      <span className="value">
                        {metrics.summary.averageMentalHealth.toFixed(0)}
                      </span>
                      <span className="unit">%</span>
                    </>
                  ) : (
                    <span className="value">N/A</span>
                  )}
                </div>
                <div className="metric-status">
                  <span
                    className={`status-badge ${
                      latestMental?.prediction_results?.mental_health_status
                        ?.toLowerCase()
                        .replace(" ", "-") || "unknown"
                    }`}
                  >
                    {latestMental?.prediction_results?.mental_health_status ||
                      "No recent data"}
                  </span>
                </div>
                {latestMental && (
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>
                        Depression:{" "}
                        {latestMental.prediction_results?.depression_level ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>
                        Anxiety:{" "}
                        {latestMental.prediction_results?.anxiety_presence ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>
                        Caffeine:{" "}
                        {latestMental.input_data?.Caffeine_Intake_mg_per_day ||
                          "N/A"}{" "}
                        mg
                      </span>
                    </div>
                  </div>
                )}
                <div className="metric-change">
                  {metrics.comparisons.mental.todayVsYesterday !== null && (
                    <span
                      className={getComparisonClass(
                        "mental",
                        metrics.comparisons.mental.todayVsYesterday
                      )}
                    >
                      {getComparisonText(
                        "mental",
                        metrics.comparisons.mental.todayVsYesterday,
                        "yesterday"
                      )}
                    </span>
                  )}
                </div>
                <div className="metric-trend">
                  <small>
                    Weekly:{" "}
                    {metrics.comparisons.mental.weekVsLastWeek !== null &&
                    !isNaN(metrics.comparisons.mental.weekVsLastWeek)
                      ? `${
                          metrics.comparisons.mental.weekVsLastWeek > 0
                            ? "+"
                            : ""
                        }${metrics.comparisons.mental.weekVsLastWeek}%`
                      : "Not enough data for weekly comparison"}
                  </small>
                </div>
                {metrics.mental.length === 0 && (
                  <div className="no-data-note">
                    No mental health data available for the selected period.
                  </div>
                )}
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
                      (item) =>
                        item.prediction_result?.prediction === "addicted"
                    ).length
                  }{" "}
                  sessions
                </div>
                <div className="metric-change">
                  {metrics.comparisons.mobile.weekVsLastWeek !== null &&
                    !isNaN(metrics.comparisons.mobile.weekVsLastWeek) && (
                      <span
                        className={getComparisonClass(
                          "mobile",
                          metrics.comparisons.mobile.weekVsLastWeek
                        )}
                      >
                        {getComparisonText(
                          "mobile",
                          metrics.comparisons.mobile.weekVsLastWeek,
                          "last week"
                        )}
                      </span>
                    )}
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
                <div className="metric-change">
                  {metrics.comparisons.academic.weekVsLastWeek !== null &&
                    !isNaN(metrics.comparisons.academic.weekVsLastWeek) && (
                      <span
                        className={getComparisonClass(
                          "academic",
                          metrics.comparisons.academic.weekVsLastWeek
                        )}
                      >
                        {getComparisonText(
                          "academic",
                          metrics.comparisons.academic.weekVsLastWeek,
                          "last week"
                        )}
                      </span>
                    )}
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
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Mental Wellness Score</h3>
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
                          ticks: { callback: (value) => value + "%" },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Depression Level Trend</h3>
                </div>
                <div className="chart-wrapper">
                  <Line
                    data={depressionChartData}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 4,
                          ticks: {
                            stepSize: 1,
                            callback: (value) =>
                              ({
                                1: "Low",
                                2: "Moderate",
                                3: "High",
                                4: "Severe",
                              }[value] || value),
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Caffeine Intake Trend</h3>
                </div>
                <div className="chart-wrapper">
                  <Line
                    data={caffeineChartData}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: "Caffeine (mg)" },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Mobile Usage Pattern</h3>
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
                              label: (ctx) =>
                                `${ctx.label}: ${ctx.raw} sessions`,
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
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Social Media Usage</h3>
                </div>
                <div className="chart-wrapper">
                  <Line
                    data={socialMediaChartData}
                    options={chartOptionsWithUnits}
                  />
                </div>
                <div className="chart-info">
                  {metrics.comparisons.socialMediaUsage.todayVsYesterday !==
                  null ? (
                    <p>
                      Your social media usage is{" "}
                      {metrics.comparisons.socialMediaUsage.todayVsYesterday > 0
                        ? "higher"
                        : "lower"}{" "}
                      than yesterday by{" "}
                      {Math.abs(
                        metrics.comparisons.socialMediaUsage.todayVsYesterday
                      )}
                      %
                    </p>
                  ) : (
                    <p>Insufficient data for comparison</p>
                  )}
                  <p>
                    Status:{" "}
                    {getUsageStatus(
                      latestMobile?.input_data?.social_media_usage || 0,
                      { low: 1, moderate: 3 }
                    )}
                  </p>
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Night Usage</h3>
                </div>
                <div className="chart-wrapper">
                  <Line
                    data={nightUsageChartData}
                    options={chartOptionsWithUnits}
                  />
                </div>
                <div className="chart-info">
                  {metrics.comparisons.nightUsage.todayVsYesterday !== null ? (
                    <p>
                      Your night usage is{" "}
                      {metrics.comparisons.nightUsage.todayVsYesterday > 0
                        ? "higher"
                        : "lower"}{" "}
                      than yesterday by{" "}
                      {Math.abs(
                        metrics.comparisons.nightUsage.todayVsYesterday
                      )}
                      %
                    </p>
                  ) : (
                    <p>Insufficient data for comparison</p>
                  )}
                  <p>
                    Status:{" "}
                    {getUsageStatus(
                      latestMobile?.input_data?.night_usage || 0,
                      { low: 1, moderate: 2 }
                    )}
                  </p>
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Work/Study Hours</h3>
                </div>
                <div className="chart-wrapper">
                  <Bar
                    data={workStudyHoursChartData}
                    options={chartOptionsWithUnits}
                  />
                </div>
                <div className="chart-info">
                  {metrics.comparisons.workStudyHours.todayVsYesterday !==
                  null ? (
                    <p>
                      You worked/studied{" "}
                      {metrics.comparisons.workStudyHours.todayVsYesterday > 0
                        ? "more"
                        : "less"}{" "}
                      than yesterday by{" "}
                      {Math.abs(
                        metrics.comparisons.workStudyHours.todayVsYesterday
                      )}
                      %
                    </p>
                  ) : (
                    <p>Insufficient data for comparison</p>
                  )}
                  <p>
                    Status:{" "}
                    {getUsageStatus(
                      latestMobile?.input_data?.work_study_hours || 0,
                      { low: 2, moderate: 5 }
                    )}
                  </p>
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Overall Wellness Radar</h3>
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
                          ticks: { stepSize: 2 },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

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

          <div className="recommendations-section">
            <h2>💡 Personalized Recommendations</h2>
            <div className="recommendations-grid">
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
                    <li>📓 Keep a gratitude journal</li>
                    <li>🌅 Get morning sunlight exposure</li>
                    <li>🏃‍♀️ Engage in regular physical activity</li>
                  </ul>
                </div>
              </div>
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
                    {getUsageStatus(
                      latestMobile?.input_data?.social_media_usage || 0,
                      { low: 1, moderate: 3 }
                    ) === "High" && (
                      <li>📱 Reduce social media usage with app timers</li>
                    )}
                    {getUsageStatus(
                      latestMobile?.input_data?.night_usage || 0,
                      { low: 1, moderate: 2 }
                    ) === "High" && (
                      <li>🌙 Avoid phone use 1-2 hours before bed</li>
                    )}
                    {getUsageStatus(
                      latestMobile?.input_data?.work_study_hours || 0,
                      { low: 2, moderate: 5 }
                    ) === "Low" && (
                      <li>📚 Increase work/study hours for productivity</li>
                    )}
                    <li>🌙 Use night mode after 8 PM</li>
                    <li>🔕 Disable non-essential notifications</li>
                  </ul>
                </div>
              </div>
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
                    <li>🗓 Plan study sessions in advance</li>
                    <li>🎯 Set specific, achievable goals</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

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

           <div
            className="report-section"
            ref={componentRef}
            style={{ position: 'absolute', left: '-9999px' }}
          >
            {/* Enhanced Report Content */}
            <div className="report-header">
              <div className="report-branding">
                <div className="brand-logo">Mentora</div>
                <div className="report-title">Wellness Dashboard Report</div>
              </div>
              <div className="report-info">
                <p><strong>Generated For:</strong> {user?.full_name}</p>
                <p><strong>Date Range:</strong> {
                  dateRange === "24hours" ? "Last 24 Hours" :
                  dateRange === "7days" ? "Last 7 Days" : 
                  "Last 30 Days"
                }</p>
                <p><strong>Generated On:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="report-summary">
              <h2>Wellness Summary</h2>
              <div className="summary-grid">
                <div className="summary-card">
                  <h3>Overall Wellness Score</h3>
                  <div className="score-value">
                    {Math.round(
                      (metrics.goals.stressReduction.progress +
                       metrics.goals.mentalWellness.progress +
                       metrics.goals.screenTime.progress) / 3
                    )}%
                  </div>
                </div>
                
                <div className="summary-card">
                  <h3>Current Status</h3>
                  <div className="status-grid">
                    <div className="status-item">
                      <span>Stress Level</span>
                      <span className="status-value">
                        {metrics.stress[metrics.stress.length - 1]?.stress_level?.toFixed(1) || 'N/A'}/10
                      </span>
                    </div>
                    <div className="status-item">
                      <span>Mental Wellness</span>
                      <span className="status-value">
                        {metrics.summary.averageMentalHealth}%
                      </span>
                    </div>
                    <div className="status-item">
                      <span>Screen Time</span>
                      <span className="status-value">
                        {metrics.summary.screenTimeAverage}h/day
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <h3>Usage Patterns</h3>
                  <div className="usage-grid">
                    <div className="usage-item">
                      <span>Social Media</span>
                      <span className="usage-value">
                        {latestMobile?.input_data?.social_media_usage || 0}h/day
                      </span>
                    </div>
                    <div className="usage-item">
                      <span>Night Usage</span>
                      <span className="usage-value">
                        {latestMobile?.input_data?.night_usage || 0}h
                      </span>
                    </div>
                    <div className="usage-item">
                      <span>Work/Study</span>
                      <span className="usage-value">
                        {latestMobile?.input_data?.work_study_hours || 0}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="report-section-content">
              <div className="report-column">
                <div className="report-metrics">
                  <h3>Key Metrics</h3>
                  <div className="metric-grid">
                    <div className="metric-item">
                      <span>Stress Level</span>
                      <span>{metrics.summary.averageStress}/10</span>
                    </div>
                    <div className="metric-item">
                      <span>Mental Wellness</span>
                      <span>{metrics.summary.averageMentalHealth}%</span>
                    </div>
                    <div className="metric-item">
                      <span>Screen Time</span>
                      <span>{metrics.summary.screenTimeAverage}h/day</span>
                    </div>
                    <div className="metric-item">
                      <span>Mobile Addiction Risk</span>
                      <span>{metrics.summary.mobileUsageStatus === "high" ? "High" : "Low"}</span>
                    </div>
                    <div className="metric-item">
                      <span>Academic Impact</span>
                      <span>{metrics.summary.academicImpact === "high" ? "High" : "Low"}</span>
                    </div>
                    <div className="metric-item">
                      <span>Active Days</span>
                      <span>{user?.current_streak || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="report-goals">
                  <h3>Goals Progress</h3>
                  <div className="goal-progress">
                    <div className="goal-item">
                      <span>Stress Reduction</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${metrics.goals.stressReduction.progress}%` }}
                        ></div>
                      </div>
                      <span>{Math.round(metrics.goals.stressReduction.progress)}%</span>
                    </div>
                    <div className="goal-item">
                      <span>Mental Wellness</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${metrics.goals.mentalWellness.progress}%` }}
                        ></div>
                      </div>
                      <span>{Math.round(metrics.goals.mentalWellness.progress)}%</span>
                    </div>
                    <div className="goal-item">
                      <span>Screen Time</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${metrics.goals.screenTime.progress}%` }}
                        ></div>
                      </div>
                      <span>{Math.round(metrics.goals.screenTime.progress)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="report-column">
                <div className="report-trends">
                  <h3>Key Trends</h3>
                  <div className="trend-category">
                    <h4>Improving Areas</h4>
                    <ul>
                      {metrics.trends.improving.map((trend, index) => (
                        <li key={index}>{trend.metric}</li>
                      ))}
                      {metrics.trends.improving.length === 0 && (
                        <li>No significant improvements detected</li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="trend-category">
                    <h4>Areas Needing Attention</h4>
                    <ul>
                      {metrics.trends.declining.map((trend, index) => (
                        <li key={index}>{trend.metric}</li>
                      ))}
                      {metrics.trends.declining.length === 0 && (
                        <li>No significant declines detected</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                <div className="report-recommendations">
                  <h3>Recommendations</h3>
                  <ul>
                    {metrics.summary.averageStress > 7 && (
                      <li>🧘‍♀️ Practice 10-minute daily meditation</li>
                    )}
                    {metrics.summary.averageMentalHealth < 60 && (
                      <li>📓 Start a gratitude journal</li>
                    )}
                    {metrics.summary.mobileUsageStatus === "high" && (
                      <li>⏰ Set app usage limits</li>
                    )}
                    {getUsageStatus(
                      latestMobile?.input_data?.social_media_usage || 0,
                      { low: 1, moderate: 3 }
                    ) === "High" && (
                      <li>📱 Reduce social media usage</li>
                    )}
                    {getUsageStatus(
                      latestMobile?.input_data?.night_usage || 0,
                      { low: 1, moderate: 2 }
                    ) === "High" && (
                      <li>🌙 Avoid phone use before bed</li>
                    )}
                    <li>🏃‍♀️ Engage in regular physical activity</li>
                    <li>😴 Maintain consistent sleep schedule</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="report-footer">
              <p>This report is generated by Mentora AI and should be used as a guide for wellness improvement.</p>
              <div className="watermark">MENTORA WELLNESS REPORT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
