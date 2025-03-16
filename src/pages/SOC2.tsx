
import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, CheckCircle, FileCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SOC2() {
  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">SOC 2 Compliance</h1>
        </div>
        
        <p className="text-lg mb-6">
          Handwriting Digitizer is committed to meeting the highest standards of security, availability, processing integrity, 
          confidentiality, and privacy. Our SOC 2 compliance demonstrates this commitment to our customers.
        </p>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">What is SOC 2?</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              SOC 2 (Service Organization Control 2) is a framework developed by the American Institute of CPAs (AICPA) that specifies how 
              organizations should manage customer data based on five "trust service principles": security, availability, processing integrity, 
              confidentiality, and privacy.
            </p>
            <p className="mt-4">
              A SOC 2 report validates that a service provider maintains appropriate controls to ensure the security and privacy of customer data.
            </p>
          </CardContent>
        </Card>
        
        <h2 className="text-xl font-semibold mb-4">Our SOC 2 Compliance Journey</h2>
        
        <div className="space-y-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Type II Certification</h3>
              <p className="text-muted-foreground">
                Handwriting Digitizer has successfully completed a SOC 2 Type II audit, which examines the operational effectiveness of our controls over a minimum period of six months.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Independent Auditing</h3>
              <p className="text-muted-foreground">
                Our compliance is verified by independent third-party auditors who assess our systems, policies, and procedures against the SOC 2 framework.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Continuous Compliance</h3>
              <p className="text-muted-foreground">
                We maintain continuous monitoring and regular audits to ensure ongoing compliance with SOC 2 requirements as our platform evolves.
              </p>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Trust Service Principles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our system is protected against unauthorized access, both physical and logical, through robust access controls, encryption, and security monitoring.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We ensure our systems are available and operational as committed or agreed, with appropriate monitoring, disaster recovery, and incident management processes.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Processing Integrity</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our system processing is complete, valid, accurate, timely, and authorized to meet the organization's objectives.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Confidentiality</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Information designated as confidential is protected as committed or agreed through encryption, access controls, and strict data handling procedures.
              </p>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Personal information is collected, used, retained, disclosed, and disposed of in accordance with our privacy policy and regulations like GDPR and CCPA.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Separator className="my-8" />
        
        <div className="bg-muted/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Request SOC 2 Report</h2>
          <p className="mb-4">
            Current and prospective customers under NDA can request access to our SOC 2 report to review our controls and compliance.
          </p>
          <a href="mailto:compliance@handwritingdigitizer.com" className="text-primary hover:underline font-medium">
            Request SOC 2 Report
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
