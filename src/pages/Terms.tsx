
import * as React from "react";

export default function Terms() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-lg mb-4">
          Welcome to Handwriting Digitizer. By using our services, you agree to these terms. Please read them carefully.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">1. Using our Services</h2>
        <p>
          You must follow any policies made available to you within the Services. You may use our Services only as permitted by law. We may suspend or stop providing our Services to you if you do not comply with our terms or policies or if we are investigating suspected misconduct.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">2. Your Data in our Services</h2>
        <p>
          Our Privacy Policy explains how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that Handwriting Digitizer can use such data in accordance with our privacy policies.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">3. Your Content in our Services</h2>
        <p>
          Our Services allow you to upload, submit, store, send or receive content. You retain ownership of any intellectual property rights that you hold in that content.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">4. Software in our Services</h2>
        <p>
          Handwriting Digitizer gives you a personal, worldwide, royalty-free, non-assignable and non-exclusive license to use the software provided to you as part of the Services. This license is for the sole purpose of enabling you to use and enjoy the benefit of the Services as provided by Handwriting Digitizer, in the manner permitted by these terms.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">5. Modifying and Terminating our Services</h2>
        <p>
          We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">6. Our Warranties and Disclaimers</h2>
        <p>
          We provide our Services using a commercially reasonable level of skill and care and we hope that you will enjoy using them. But there are certain things that we don't promise about our Services.
        </p>
        
        <p className="mt-8 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
