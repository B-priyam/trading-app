"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  TrendingUp,
  Calculator,
  BarChart3,
  Database,
  Shield,
  Zap,
} from "lucide-react";
import heroImage from "@/assets/hero-trading.jpg";
import Link from "next/link";
import Image from "next/image";

const page = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Strategy Builder",
      description:
        "Construct complex option strategies with ease. Straddles, Strangles, Iron Condors, and more.",
    },
    {
      icon: Calculator,
      title: "Options Simulator",
      description:
        "Simulate trades with real-time Greeks. Analyze Delta, Gamma, Theta, and Vega instantly.",
    },
    {
      icon: BarChart3,
      title: "Payoff Visualizer",
      description:
        "Interactive charts showing profit/loss scenarios across different spot prices.",
    },
    {
      icon: Database,
      title: "Market Data",
      description:
        "Access comprehensive options chain data for NIFTY, BANKNIFTY, and NSE stocks.",
    },
    {
      icon: Shield,
      title: "Risk Analysis",
      description:
        "Understand your risk exposure with detailed breakeven and max loss calculations.",
    },
    {
      icon: Zap,
      title: "Fast & Intuitive",
      description:
        "Built for speed with a clean interface that both beginners and pros will love.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-50" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                NSE/BSE Options Trading
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Master Options Trading with
                <span className="block gradient-primary bg-clip-text text-transparent">
                  Smart Strategies
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Build, simulate, and analyze options strategies for the Indian
                stock market. Make informed decisions with powerful tools and
                real-time data visualization.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/strategy-builder">
                  <Button
                    size="lg"
                    className="gradient-primary shadow-glow w-full sm:w-auto"
                  >
                    Build Strategy
                  </Button>
                </Link>
                <Link href="/options-simulator">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Simulate Trade
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <Image
                src={"/hero-trading.jpg"}
                alt="Trading Platform Visualization"
                className="relative rounded-2xl shadow-2xl"
                height={1000}
                width={1000}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Trade Smarter
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional-grade tools designed for the Indian options market
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="transition-smooth hover:shadow-lg hover:-translate-y-1 border-border"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="gradient-primary text-primary-foreground border-0 shadow-glow">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Trading?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of traders using OptionsHub to make better
              decisions
            </p>
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="text-primary">
                Create Free Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 OptionsHub. Built for NSE/BSE options trading.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default page;
