
import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "$99",
      description: "Perfect for small businesses just getting started",
      features: [
        "Process up to 500 pages per month",
        "Up to 3 team members",
        "Basic document templates",
        "Standard support",
        "14-day retention",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$199",
      description: "Ideal for growing businesses with more complex needs",
      features: [
        "Process up to 2,500 pages per month",
        "Up to 10 team members",
        "Advanced document templates",
        "Priority support",
        "30-day retention",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Tailored solutions for organizations with high-volume needs",
      features: [
        "Unlimited pages",
        "Unlimited team members",
        "Custom document templates",
        "Dedicated support",
        "90-day retention",
        "Advanced API access",
        "SSO & custom integrations",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Pricing Plans</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that's right for your business
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {tiers.map((tier, index) => (
          <Card key={index} className={`${tier.popular ? 'ring-2 ring-primary' : ''} relative`}>
            {tier.popular && (
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                {tier.price}
                {tier.price !== "Custom" && <span className="ml-1 text-2xl font-medium text-muted-foreground">/mo</span>}
              </div>
              <CardDescription className="mt-2">{tier.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <p className="ml-3 text-sm text-muted-foreground">
                      {feature}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={tier.popular ? "default" : "outline"}
              >
                {tier.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
          <br />
          Have questions? <a href="/contact" className="text-primary hover:underline">Contact our sales team</a>
        </p>
      </div>
    </div>
  );
}
