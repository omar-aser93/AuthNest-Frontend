
// Page metadata
export const metadata = { 
  title: "Privacy Policy - AuthNest",
  description: "Learn more about our privacy policy.",
}

export default function PrivacyPolicyPage() {
  return (  
    <div className="min-h-screen text-[#0a0a0f] px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-[#8888a4] mb-4 leading-relaxed"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <p className="text-[#8888a4] mb-4 leading-relaxed">
          At AuthNest, we respects your privacy. This policy explains how we collect, use,
          and protect your personal data.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">What we collect</h2>
        <ul className="text-[#8888a4] mb-4 leading-relaxed">
          <li>Account information (name, email, profile picture)</li>
          <li>Content you create (posts, comments, tags)</li>
          <li>Usage data (pages visited, features used)</li>
        </ul>
        <h2 className="text-2xl font-bold mt-8 mb-3">How we use it</h2>
        <ul className="text-[#8888a4] mb-4 leading-relaxed">
          <li>To provide and improve the service</li>
          <li>To personalise your experience</li>
          <li>To send occasional product updates (opt‑out anytime)</li>
        </ul>
        <h2 className="text-2xl font-bold mt-8 mb-3">Your rights</h2>
        <ul className="text-[#8888a4] mb-4 leading-relaxed">
          <li>Access, correct, or delete your data at any time</li>
          <li>Export your data (future feature)</li>
        </ul>
      </div>
    </div>
  );
}