import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  BarChart3, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  School,
  FileText,
  Clock
} from "lucide-react";
import { useEffect, useState } from "react";
import techBg1 from "@/assets/tech-bg-1.jpg";
import techBg2 from "@/assets/tech-bg-2.jpg";
import techBg3 from "@/assets/tech-bg-3.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const backgroundImages = [techBg1, techBg2, techBg3];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000); // Change background every 5 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);
  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-Role Access",
      description: "Role-based system for administrators, teachers, students, and parents with secure authentication."
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: "Student & Class Management",
      description: "Complete student profiles, class organization, subject allocation, and grade tracking system."
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Digital Report Cards",
      description: "Automated report generation with customizable templates and instant parent access."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Performance Analytics",
      description: "Live insights into student performance, marks tracking, rankings, and progress reports."
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Real-time Updates",
      description: "Instant synchronization of all data across users with live notifications and updates."
    }
  ];

  const colorClasses = [
    { bg: 'bg-primary/10', iconBg: 'bg-gradient-to-br from-primary to-accent text-white', text: 'text-primary' },
    { bg: 'bg-accent/10', iconBg: 'bg-gradient-to-br from-accent to-secondary text-white', text: 'text-accent' },
    { bg: 'bg-secondary/10', iconBg: 'bg-gradient-to-br from-secondary to-primary text-white', text: 'text-secondary' }
  ];

  const benefits = [
    {
      title: "For Administrators",
      items: [
        "Complete oversight of all departments and classes",
        "User management across all roles with permissions",
        "Real-time analytics and performance reports",
        "Automated term and report card generation"
      ]
    },
    {
      title: "For Teachers",
      items: [
        "Digital marks entry and grade calculations",
        "Student performance monitoring by class",
        "Automated cumulative score and ranking calculations",
        "Class analytics and report generation"
      ]
    },
    {
      title: "For Parents",
      items: [
        "Instant access to children's marks and reports",
        "Real-time performance tracking and updates",
        "View academic progress and rankings",
        "Track performance trends over time"
      ]
    },
    {
      title: "Key Features",
      items: [
        "Customizable report card templates",
        "Department-based subject management",
        "Multi-school support with isolated data",
        "Automated grade calculations and rankings"
      ]
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((bg, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === currentBgIndex ? 'opacity-40' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${bg})` }}
          />
        ))}

        {/* Colorful gradient overlay + subtle blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-accent/50 to-secondary/80 mix-blend-screen opacity-95" />
        <div className="absolute -left-40 -top-32 w-72 h-72 rounded-full bg-gradient-to-br from-primary to-accent opacity-30 blur-3xl" />
        <div className="absolute -right-36 -bottom-28 w-80 h-80 rounded-full bg-gradient-to-br from-secondary to-accent opacity-20 blur-3xl" />
      </div>
      {/* Hero Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6 animate-float">
            <div className="bg-white/10 p-6 rounded-full border border-white/20 shadow-lg">
              <School className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in">
            Welcome to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Cumulative Score and Rank Analyzer</span>
          </h1>
          <p className="text-xl md:text-2xl text-background/90 mb-8 max-w-3xl mx-auto animate-fade-in">
            Comprehensive School Management System designed to streamline administrative processes 
            and enhance educational outcomes for institutions across Zambia.
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6 rounded-full hover:scale-105 transition-transform shadow-xl animate-scale-in bg-gradient-to-r from-primary to-accent text-white"
          >
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-16 px-4 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your educational institution efficiently and effectively.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const palette = colorClasses[index % colorClasses.length];
              return (
                <Card key={index} className={`text-center hover:shadow-lg transition-all duration-300 border-0 ${palette.bg} backdrop-blur-sm hover:scale-105 animate-fade-in border-l-4 border-l-primary/20`} style={{animationDelay: `${index * 0.1}s`}}>
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className={`${palette.iconBg} p-3 rounded-full`}>{feature.icon}</div>
                    </div>
                    <CardTitle className={`text-lg ${palette.text}`}>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-16 px-4 bg-gradient-to-r from-accent/20 to-secondary/20 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Benefits for Everyone
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cumulative Score and Rank Analyzer serves all stakeholders in the educational ecosystem with tailored solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-background/90 backdrop-blur-sm animate-fade-in" style={{animationDelay: `${index * 0.2}s`}}>
                <CardHeader>
                  <CardTitle className="text-xl text-primary flex items-center">
                    <TrendingUp className="h-6 w-6 mr-2" />
                    {benefit.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {benefit.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="relative z-10 py-16 px-4 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Cumulative Score and Rank Analyzer?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center bg-background/90 backdrop-blur-sm border-0 hover:scale-105 transition-transform duration-300 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <CardContent className="pt-8">
                <div className="text-4xl font-bold mb-2 animate-float bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">100%</div>
                <div className="text-lg font-medium mb-2">Digital Transformation</div>
                <p className="text-muted-foreground">Complete paperless school management solution</p>
              </CardContent>
            </Card>
            
            <Card className="text-center bg-background/90 backdrop-blur-sm border-0 hover:scale-105 transition-transform duration-300 animate-fade-in" style={{animationDelay: '0.3s'}}>
              <CardContent className="pt-8">
                <div className="text-4xl font-bold mb-2 animate-float bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent" style={{animationDelay: '1s'}}>24/7</div>
                <div className="text-lg font-medium mb-2">System Availability</div>
                <p className="text-muted-foreground">Access your data anytime, anywhere with cloud reliability</p>
              </CardContent>
            </Card>
            
            <Card className="text-center bg-background/90 backdrop-blur-sm border-0 hover:scale-105 transition-transform duration-300 animate-fade-in" style={{animationDelay: '0.5s'}}>
              <CardContent className="pt-8">
                <div className="text-4xl font-bold mb-2 animate-float bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" style={{animationDelay: '2s'}}>Real-time</div>
                <div className="text-lg font-medium mb-2">Data Updates</div>
                <p className="text-muted-foreground">Instant synchronization across all user roles</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="max-w-4xl mx-auto border-0 bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardContent className="pt-12 pb-12">
              <GraduationCap className="h-16 w-16 text-primary mx-auto mb-6 animate-float" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your School?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join the digital education revolution with Cumulative Score and Rank Analyzer. Streamline your operations, 
                improve communication, and enhance educational outcomes.
              </p>
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="text-lg px-12 py-6 rounded-full hover:scale-105 transition-transform shadow-lg hover:shadow-xl animate-scale-in"
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 bg-background/95 backdrop-blur-sm border-t">
        <div className="container mx-auto text-center">
            <p className="text-muted-foreground">
            © 2024 Cumulative Score and Rank Analyzer. Empowering Education Through Technology.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;