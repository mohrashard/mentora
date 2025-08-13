from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Frame, PageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def escape_html(text):
    """Escape special characters for HTML"""
    if not isinstance(text, str):
        text = str(text)
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;')

def generate_html_report(user_data, metrics):
    """Generate a modern HTML wellness report with inline CSS"""
    try:
        current_date = datetime.now().strftime("%B %d, %Y")
        week_range = (datetime.now() - timedelta(days=7)).strftime("%B %d") + " - " + datetime.now().strftime("%B %d, %Y")
        
        summary = metrics.get('summary', {})
        avg_stress = round(summary.get('averageStress', 0), 1)
        avg_mental = round(summary.get('averageMentalHealth', 0), 1)
        avg_screen = round(summary.get('screenTimeAverage', 0), 1)
        overall_score = get_overall_score(avg_stress, avg_mental, avg_screen)
        
        latest_mobile = metrics.get('mobile', [{}])[-1] if metrics.get('mobile') else {}
        social_media = get_nested_value(latest_mobile, 'input_data.social_media_usage', 0)
        night_usage = get_nested_value(latest_mobile, 'input_data.night_usage', 0)
        
        # HTML structure with inline CSS
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mentora Wellness Report</title>
<style>
    body {{ 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
        margin: 0; 
        padding: 20px; 
        background: linear-gradient(135deg, #f0fdfa, #e0f2fe); 
        color: #111827; 
        line-height: 1.6; 
    }}
    .container {{ 
        max-width: 850px; 
        margin: 0 auto; 
        background: white; 
        padding: 30px; 
        border-radius: 16px; 
        box-shadow: 0 8px 24px rgba(0,0,0,0.08); 
    }}
    .header {{ 
        background: linear-gradient(90deg, #14b8a6, #0ea5e9); 
        color: white; 
        padding: 25px; 
        text-align: center; 
        border-radius: 12px 12px 0 0; 
    }}
    .header h1 {{ 
        margin: 0; 
        font-size: 30px; 
        letter-spacing: 0.5px; 
    }}
    .small-text {{ 
        font-size: 14px; 
        color: rgba(255,255,255,0.9); 
    }}
    .section {{ 
        margin: 25px 0; 
    }}
    .section h2 {{ 
        background: linear-gradient(90deg, #475569, #334155); 
        color: white; 
        padding: 12px; 
        text-align: center; 
        border-radius: 8px; 
        font-size: 20px; 
        font-weight: 500; 
    }}
    .summary-grid {{ 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); 
        gap: 20px; 
    }}
    .card {{ 
        background: #f0fdfa; 
        border: 1px solid #14b8a6; 
        border-radius: 12px; 
        padding: 18px; 
        text-align: center; 
        transition: all 0.3s ease; 
    }}
    .card:hover {{ 
        transform: translateY(-3px); 
        box-shadow: 0 6px 16px rgba(20, 184, 166, 0.2); 
    }}
    .card h3 {{ 
        font-size: 17px; 
        margin-bottom: 10px; 
        color: #1f2937; 
        font-weight: 600; 
    }}
    .score {{ 
        font-size: 40px; 
        font-weight: bold; 
        letter-spacing: 1px; 
        background: linear-gradient(90deg, #14b8a6, #0ea5e9); 
        -webkit-background-clip: text; 
        -webkit-text-fill-color: transparent; 
    }}
    .metrics-grid {{ 
        display: grid; 
        grid-template-columns: repeat(2, 1fr); 
        gap: 15px; 
    }}
    .metric-item {{ 
        background: #f9fafb; 
        border: 1px solid #d1d5db; 
        border-radius: 10px; 
        padding: 12px; 
        text-align: center; 
        font-size: 15px; 
        transition: all 0.3s ease; 
    }}
    .metric-item:hover {{ 
        background: #ecfeff; 
        border-color: #0ea5e9; 
        transform: translateY(-2px); 
    }}
    .recommendation {{ 
        margin: 6px 0; 
        color: #374151; 
        font-size: 15px; 
        padding: 6px 10px; 
        background: #fef9c3; 
        border-radius: 6px; 
    }}
    .footer {{ 
        text-align: center; 
        margin-top: 30px; 
        font-size: 12px; 
        color: #6b7280; 
        border-top: 2px solid #14b8a6; 
        padding-top: 15px; 
    }}
</style>

        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MENTORA Personal Wellness Dashboard Report</h1>
                    <p class="small-text">Comprehensive Health & Digital Wellness Analysis</p>
                </div>
                
                <div class="section">
                    <p><strong>Generated For:</strong> {escape_html(user_data.get('full_name', 'User'))}</p>
                    <p><strong>Analysis Period:</strong> Last 7 Days ({week_range})</p>
                    <p><strong>Generated On:</strong> {current_date}</p>
                </div>
                
                <div class="section">
                    <h2>Executive Summary</h2>
                    <div class="summary-grid">
                        <div class="card">
                            <h3>Overall Wellness Score</h3>
                            <div class="score" style="color: {get_score_color(overall_score)};">{overall_score}%</div>
                            <p class="small-text">Wellness Index</p>
                        </div>
                        <div class="card">
                            <h3>Current Health Status</h3>
                            <p class="small-text" style="color: {get_status_color(avg_stress, avg_mental, avg_screen)};">
                                Stress Level: {avg_stress}/10<br>
                                Mental Wellness: {avg_mental}%<br>
                                Screen Time: {avg_screen}h/day
                            </p>
                        </div>
                        <div class="card">
                            <h3>Digital Usage Patterns</h3>
                            <p class="small-text">
                                Social Media: {social_media}h/day<br>
                                Night Usage: {night_usage}h<br>
                                Work/Study: 0h/day
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Key Health Metrics</h2>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            🧠 Stress Level<br><strong style="color: {get_metric_color(avg_stress, 'stress')};">{avg_stress}/10</strong>
                        </div>
                        <div class="metric-item">
                            😊 Mental Wellness<br><strong style="color: {get_metric_color(avg_mental, 'mental')};">{avg_mental}%</strong>
                        </div>
                        <div class="metric-item">
                            📱 Screen Time<br><strong style="color: {get_metric_color(avg_screen, 'screen')};">{avg_screen}h/day</strong>
                        </div>
                        <div class="metric-item">
                            🔥 Active Streak<br><strong style="color: #059669;">{user_data.get('current_streak', 0)} days</strong>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Personalized Recommendations</h2>
                    {get_recommendations_html(summary, latest_mobile)}
                </div>
                
                <div class="footer">
                    Generated by Mentora AI's advanced analytics.<br>
                    Guide your wellness journey with these insights.<br>
                    Contact support@mentora.ai for assistance.
                </div>
            </div>
        </body>
        </html>
        """
        
        logger.info(f"HTML report generated for user: {user_data.get('full_name', 'Unknown')}")
        return html
    except Exception as e:
        logger.error(f"Error generating HTML: {str(e)}")
        return generate_error_html(user_data, str(e))

# Helper functions (kept similar to original)
def get_overall_score(stress, mental, screen):
    stress_score = max(0, 10 - stress) * 10
    mental_score = mental
    screen_score = max(0, 10 - min(screen, 10)) * 10
    return int((stress_score + mental_score + screen_score) / 3)

def get_score_color(score):
    return '#dc2626' if score < 40 else '#d97706' if score < 70 else '#059669'

def get_status_color(stress, mental, screen):
    if stress > 7 or mental < 50 or screen > 8:
        return '#dc2626'
    elif stress > 5 or mental < 70 or screen > 6:
        return '#d97706'
    return '#059669'

def get_metric_color(value, metric_type):
    if metric_type == 'stress':
        return '#dc2626' if value > 7 else '#d97706' if value > 5 else '#059669'
    elif metric_type == 'mental':
        return '#dc2626' if value < 50 else '#d97706' if value < 70 else '#059669'
    elif metric_type == 'screen':
        return '#dc2626' if value > 8 else '#d97706' if value > 6 else '#059669'
    return '#059669'

def get_recommendations_html(summary, latest_mobile):
    recommendations = []
    if summary.get('averageStress', 0) > 7:
        recommendations.append("🧘‍♀️ Practice daily meditation")
    if summary.get('averageMentalHealth', 0) < 60:
        recommendations.append("📓 Start a gratitude journal")
    if get_nested_value(latest_mobile, 'input_data.social_media_usage', 0) > 3:
        recommendations.append("📱 Reduce social media")
    if get_nested_value(latest_mobile, 'input_data.night_usage', 0) > 2:
        recommendations.append("🌙 Avoid phone before bed")
    recommendations.extend([
        "🏃‍♀️ Engage in regular activity",
        "😴 Maintain consistent sleep"
    ])
    
    html = ""
    for rec in recommendations[:6]:
        html += f'<p class="recommendation">→ {escape_html(rec)}</p>'
    return html

def get_nested_value(data, path, default=None):
    keys = path.split('.')
    value = data
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default
    return value if value is not None else default

def generate_error_html(user_data, error_message):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Mentora Report Error</title></head>
    <body>
        <h1>Mentora Wellness Report - Error</h1>
        <p>For: {escape_html(user_data.get('full_name', 'User'))}</p>
        <p>Issue generating report. Error: {escape_html(error_message)}</p>
        <p>Contact support if this persists.</p>
        <p><b>Mentora Team</b></p>
    </body>
    </html>
    """