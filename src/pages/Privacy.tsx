
import * as React from "react";

export default function Privacy() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-lg mb-4">
          This Privacy Policy describes how Handwriting Digitizer collects, uses, and shares your personal information when you use our services.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, upload documents, or contact us for support. This may include your name, email address, and the content of the documents you upload.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, including to process and digitize your handwritten documents. We may also use the information to communicate with you about our services, provide customer support, and protect our services.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">How We Share Your Information</h2>
        <p>
          We do not share your personal information or document content with third parties except as described in this policy. We may share your information with service providers who perform services on our behalf, such as hosting or analytics.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Data Security</h2>
        <p>
          We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access. All data is encrypted both in transit and at rest.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Your Rights</h2>
        <p>
          Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. To exercise these rights, please contact us at privacy@handwritingdigitizer.com.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make significant changes, we will notify you by email or through our service.
        </p>
        
        <p className="mt-8 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
