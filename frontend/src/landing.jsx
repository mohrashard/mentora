

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import "./Landing.css";

const Landing = () => {
  const [activeSection, setActiveSection] = useState("home");
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [counters, setCounters] = useState({ cost: 0, users: 0, accuracy: 0 });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const aboutSectionRef = useRef(null);

  const navigate = useNavigate();
  const handleGetStarted = () => {
    navigate('/register');
  };

  // Scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "home",
        "about",
        "features",
        "how-it-works",
        "testimonials",
        "contact",
        "help",
      ];
      const scrollPosition = window.scrollY + 100;

      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;

          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animated counters
  useEffect(() => {
    const animateCounters = () => {
      const targets = { cost: 1000, users: 50000, accuracy: 95 };
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setCounters({
          cost: Math.floor(targets.cost * progress),
          users: Math.floor(targets.users * progress),
          accuracy: Math.floor(targets.accuracy * progress),
        });

        if (currentStep >= steps) {
          clearInterval(timer);
          setCounters(targets);
        }
      }, stepTime);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    });

    if (aboutSectionRef.current) observer.observe(aboutSectionRef.current);

    return () => observer.disconnect();
  }, []);

  // Testimonial carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Mental Health Advocate",
      text: "Mentora helped me understand my digital wellness patterns in ways I never imagined.",
      rating: 5,
    },
    {
      name: "Dr. Michael Rodriguez",
      role: "Clinical Psychologist",
      text: "The AI insights are remarkably accurate and provide valuable therapeutic guidance.",
      rating: 5,
    },
    {
      name: "Emma Thompson",
      role: "Wellness Coach",
      text: "My clients love how Mentora makes mental wellness accessible and personalized.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How does Mentora analyze my digital behavior?",
      answer:
        "Mentora uses advanced AI algorithms to analyze patterns in your digital interactions, screen time, and app usage to provide personalized mental wellness insights.",
    },
    {
      question: "Is my data secure and private?",
      answer:
        "Absolutely. We use end-to-end encryption and never share your personal data. All analysis is done locally on your device when possible.",
    },
    {
      question: "How accurate are the AI insights?",
      answer:
        "Our AI models achieve 95% accuracy in behavioral pattern recognition, validated through clinical studies and user feedback.",
    },
    {
      question: "Can I use Mentora alongside traditional therapy?",
      answer:
        "Yes! Mentora is designed to complement, not replace, professional mental health care. Many therapists recommend it to their clients.",
    },
  ];

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user_id', data.user_id);
        console.log('Login successful:', data);
        navigate('/dashboard'); 
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="stars"></div>
        <div className="particles"></div>
      </div>

      {/* Navigation */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-placeholder" aria-label="Mentora Logo"></div>
            <span className="logo-text">Mentora</span>
          </div>

          <ul className="nav-links">
            {[
              "home",
              "about",
              "features",
              "how-it-works",
              "testimonials",
              "contact",
              "help",
            ].map((section) => (
              <li key={section}>
                <button
                  className={`nav-link ${
                    activeSection === section ? "active" : ""
                  }`}
                  onClick={() => scrollToSection(section)}
                  aria-current={activeSection === section ? "page" : undefined}
                >
                  {section
                    .replace("-", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              </li>
            ))}
          </ul>

          <div className="nav-user">
            <button
              className="user-icon"
              onClick={() => setShowLoginDropdown(!showLoginDropdown)}
              aria-expanded={showLoginDropdown}
              aria-haspopup="true"
            >
              <div className="user-avatar"></div>
            </button>

            {showLoginDropdown && (
              <div
                className="login-dropdown"
                role="dialog"
                aria-label="Login form"
              >
                <form className="login-form" onSubmit={handleLogin}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    aria-label="Email"
                    value={loginData.email}
                    onChange={handleInputChange}
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                    aria-label="Password"
                    value={loginData.password}
                    onChange={handleInputChange}
                  />
                  <button type="submit" className="login-btn">
                    Sign In
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <div className="brain-model-container">
            <div className="brain-model" aria-label="3D Brain Model"></div>
          </div>

          <div className="hero-text">
            <h1 className="hero-title">Your AI Mental Wellness Companion</h1>
            <p className="hero-subtitle">
              Personalized insights from digital behavior analysis
            </p>

            <div className="hero-ctas">
                  <button
      className="cta-primary"
      aria-label="Get started with Mentora"
      onClick={handleGetStarted}
    >
      Get Started
    </button>
              <button className="cta-secondary" aria-label="Watch demo video">
                See Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section" ref={aboutSectionRef}>
        <div className="container">
          <h2 className="section-title">The Mental Health Crisis</h2>

          <div className="problem-solution-container">
            <div className="problem-card glass-card">
              <h3>The Problem</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">${counters.cost}B+</div>
                  <div className="stat-label">Annual Mental Health Costs</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">
                    {counters.users.toLocaleString()}+
                  </div>
                  <div className="stat-label">People Seeking Help</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{counters.accuracy}%</div>
                  <div className="stat-label">Unmet Mental Health Needs</div>
                </div>
              </div>
            </div>

            <div className="solution-card glass-card">
              <h3>Our Solution</h3>
              <p>
                Mentora leverages AI to provide personalized mental wellness
                insights by analyzing your digital behavior patterns, making
                mental health support accessible, proactive, and tailored to
                your unique needs.
              </p>
              <ul className="solution-features">
                <li>Real-time behavioral analysis</li>
                <li>Personalized wellness recommendations</li>
                <li>Early intervention alerts</li>
                <li>Privacy-first approach</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Core Features</h2>

          <div className="features-container">
            <div className="feature-cube-container">
              <div className="feature-cube">
                <div className="cube-face front">
                  <h3>AI Analysis</h3>
                  <p>Advanced behavioral pattern recognition</p>
                </div>
                <div className="cube-face back">
                  <h3>Privacy First</h3>
                  <p>End-to-end encryption and local processing</p>
                </div>
                <div className="cube-face right">
                  <h3>Real-time Insights</h3>
                  <p>Instant wellness recommendations</p>
                </div>
                <div className="cube-face left">
                  <h3>Personalization</h3>
                  <p>Tailored to your unique patterns</p>
                </div>
                <div className="cube-face top">
                  <h3>Integration</h3>
                  <p>Works with your existing apps</p>
                </div>
                <div className="cube-face bottom">
                  <h3>Support</h3>
                  <p>24/7 AI-powered assistance</p>
                </div>
              </div>
            </div>

            <div className="feature-cards">
              <div className="feature-card glass-card">
                <div className="feature-icon">🧠</div>
                <h3>Behavioral Analysis</h3>
                <p>AI-powered analysis of digital behavior patterns</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "95%" }}></div>
                </div>
                <span className="accuracy-label">95% Accuracy</span>
              </div>

              <div className="feature-card glass-card">
                <div className="feature-icon">🔒</div>
                <h3>Privacy Protection</h3>
                <p>Your data stays secure with advanced encryption</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: "100%" }}
                  ></div>
                </div>
                <span className="accuracy-label">100% Secure</span>
              </div>

              <div className="feature-card glass-card">
                <div className="feature-icon">⚡</div>
                <h3>Real-time Insights</h3>
                <p>Instant recommendations and wellness alerts</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "98%" }}></div>
                </div>
                <span className="accuracy-label">98% Response Time</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>

          <div className="workflow-container">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Data Collection</h3>
                <p>Securely analyze your digital behavior patterns</p>
                <div className="mockup-screen screen-1"></div>
              </div>
            </div>

            <div className="workflow-arrow">
              <div className="arrow-line"></div>
              <div className="flow-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>AI Analysis</h3>
                <p>Advanced algorithms process your behavioral data</p>
                <div className="mockup-screen screen-2"></div>
              </div>
            </div>

            <div className="workflow-arrow">
              <div className="arrow-line"></div>
              <div className="flow-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Personalized Insights</h3>
                <p>Receive tailored wellness recommendations</p>
                <div className="mockup-screen screen-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What Our Users Say</h2>

          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <div className="testimonial-front">
                  <div className="quote-icon">"</div>
                  <p className="testimonial-text">
                    {testimonials[currentTestimonial].text}
                  </p>
                  <div className="rating">
                    {[...Array(testimonials[currentTestimonial].rating)].map(
                      (_, i) => (
                        <span key={i} className="star">
                          ★
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="testimonial-back">
                  <div className="author-info">
                    <div className="author-avatar"></div>
                    <div className="author-details">
                      <h4>{testimonials[currentTestimonial].name}</h4>
                      <p>{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="testimonial-indicators">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${
                    index === currentTestimonial ? "active" : ""
                  }`}
                  onClick={() => setCurrentTestimonial(index)}
                  aria-label={`View testimonial ${index + 1}`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">Get In Touch</h2>

          <div className="contact-container">
            <div className="contact-form-container">
              <form className="contact-form glass-card">
                <div className="form-group">
                  <input type="text" id="name" required />
                  <label htmlFor="name" className="floating-label">
                    Your Name
                  </label>
                </div>

                <div className="form-group">
                  <input type="email" id="email" required />
                  <label htmlFor="email" className="floating-label">
                    Email Address
                  </label>
                </div>

                <div className="form-group">
                  <input type="text" id="subject" required />
                  <label htmlFor="subject" className="floating-label">
                    Subject
                  </label>
                </div>

                <div className="form-group">
                  <textarea id="message" rows="5" required></textarea>
                  <label htmlFor="message" className="floating-label">
                    Message
                  </label>
                </div>

                <button type="submit" className="submit-btn">
                  Send Message
                  <div className="particle-burst"></div>
                </button>
              </form>
            </div>

            <div className="contact-map">
              <div className="map-container">
                <div className="map-terrain"></div>
                <div className="map-markers">
                  <div className="marker"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Help/FAQ Section */}
      <section id="help" className="help-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>

          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item glass-card">
                <button
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openFAQ === index}
                >
                  <span>{faq.question}</span>
                  <div className={`chevron ${openFAQ === index ? "open" : ""}`}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>

                <div
                  className={`faq-answer ${openFAQ === index ? "open" : ""}`}
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="wave-divider">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
            ></path>
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
            ></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
          </svg>
        </div>

        <div className="footer-content">
          <div className="footer-section">
            <h3>Mentora</h3>
            <p>AI-Powered Mental Wellness Platform</p>
            <div className="social-icons">
              <a href="#" aria-label="Facebook" className="social-icon">
                📘
              </a>
              <a href="#" aria-label="Twitter" className="social-icon">
                🐦
              </a>
              <a href="#" aria-label="LinkedIn" className="social-icon">
                💼
              </a>
              <a href="#" aria-label="Instagram" className="social-icon">
                📷
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#">Features</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
              <li>
                <a href="#">API</a>
              </li>
              <li>
                <a href="#">Documentation</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#">About</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Press</a>
              </li>
              <li>
                <a href="#">Contact</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li>
                <a href="#">Help Center</a>
              </li>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms of Service</a>
              </li>
              <li>
                <a href="#">Security</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="marquee-container">
            <div className="marquee-content">
              <span>Trusted by leading healthcare providers</span>
              <span>•</span>
              <span>Featured in TechCrunch</span>
              <span>•</span>
              <span>Winner of AI Innovation Award 2024</span>
              <span>•</span>
              <span>Certified by Mental Health America</span>
              <span>•</span>
            </div>
          </div>

          <div className="copyright">
            <p>&copy; 2024 Mentora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
