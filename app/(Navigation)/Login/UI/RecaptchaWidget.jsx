"use client";

import { useEffect, useRef } from "react";

export default function RecaptchaWidget({
  onVerify,
  onExpire,
  onError,
  className = "",
}) {
  const containerRef = useRef(null); // References where the reCAPTCHA will render
  const widgetIdRef = useRef(null); // Stores widget instance to prevent dupliate attempts

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    
    // Ensure that site ket is available
    if (!siteKey) {
      console.error("Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
      return;
    }

    // Render reCAPTCHA widget inside a containter (tells Google to render the checkbox here)
    const renderWidget = () => {
      if (!window.grecaptcha || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;
      
      // Prevents rendering multiple widgets
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        size: "normal",
        // Called when user completes reCAPTCHA successfully
        callback: (token) => {
          onVerify?.(token);
        },
        // Called when the reCAPTCHA times out
        "expired-callback": () => {
          onExpire?.();
        },
        // Called when the reCAPTCHA fails to load
        "error-callback": () => {
          onError?.();
        },
      });
    };

    window.onRecaptchaLoadCallback = renderWidget;

    const existingScript = document.querySelector(
      'script[src^="https://www.google.com/recaptcha/api.js"]'
    );
    
    // Load reCAPTCHA script if not already loaded
    if (!existingScript) {
      const script = document.createElement("script");
      script.src =
        "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallback&render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    // If the script already exists, renders immediately
    else if (window.grecaptcha) {
      renderWidget();
    }

    // Clean up callback on unmount
    return () => {
      window.onRecaptchaLoadCallback = undefined;
    };
  }, [onVerify, onExpire, onError]);

  return <div ref={containerRef} className={className} />;
}