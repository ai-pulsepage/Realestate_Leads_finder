// Onboarding Wizard
// Next.js page for profile setup

import { useState } from 'react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({});

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else submitProfile();
  };

  const submitProfile = async () => {
    await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <input placeholder="Business Name" onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} />
          <button onClick={handleNext}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <input placeholder="Services (JSON)" onChange={(e) => setProfile({ ...profile, services_offered: JSON.parse(e.target.value) })} />
          <button onClick={handleNext}>Next</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <input type="file" onChange={(e) => setProfile({ ...profile, license: e.target.files[0] })} />
          <button onClick={handleNext}>Submit</button>
        </div>
      )}
    </div>
  );
}