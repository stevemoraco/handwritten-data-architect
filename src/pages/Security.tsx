
import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Security() {
  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Security</h1>
        </div>
        
        <p className="text-lg mb-8">
          At Handwriting Digitizer, we take the security of your data seriously. Our platform is built with 
          multiple layers of protection to ensure your documents and information remain secure and confidential.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Data Encryption
              </CardTitle>
              <CardDescription>End-to-end protection for your data</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Your documents never exist in an unencrypted state on our servers.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Access Controls
              </CardTitle>
              <CardDescription>Granular permissions and authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Our platform implements OAuth 2.0, multi-factor authentication, and role-based access controls to ensure only authorized personnel can access your data.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Threat Detection
              </CardTitle>
              <CardDescription>Proactive monitoring and prevention</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                We employ 24/7 monitoring for suspicious activities, regular penetration testing, and automated vulnerability scanning to identify and address potential security threats.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Compliance
              </CardTitle>
              <CardDescription>Meeting industry standards</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Our security practices are aligned with industry standards including SOC 2, HIPAA, GDPR, and CCPA to ensure regulatory compliance for your organization.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Security Commitments</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Regular security audits and penetration testing by independent third parties</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Data residency options for organizations with geographic requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Secure development practices including code reviews and security testing</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Transparent incident response with timely notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Employee security training and background checks</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Have Security Concerns?</h2>
          <p className="mb-4">
            If you have any questions or concerns about our security practices, or if you'd like to report a vulnerability, please contact our security team.
          </p>
          <a href="mailto:security@handwritingdigitizer.com" className="text-primary hover:underline font-medium">
            security@handwritingdigitizer.com
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
