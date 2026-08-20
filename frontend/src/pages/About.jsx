import React from 'react';
import { ShieldAlert, Cpu, Activity, BarChart, Binary } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
      
      <header className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white glow-text">Methodology & About</h1>
        <p className="text-textMuted text-lg">
          Understanding the science behind StegoDetect AI
        </p>
      </header>

      <section className="card space-y-4">
        <h2 className="text-2xl font-medium flex items-center gap-3">
          <ShieldAlert className="text-primary" /> What is Steganography?
        </h2>
        <p className="text-textMain leading-relaxed">
          Steganography is the practice of concealing a file, message, image, or video within another file, message, image, or video. 
          Unlike cryptography, which scrambles a message to make it unreadable, steganography hides the very existence of the message. 
          In digital images, this is most commonly achieved by slightly altering the color values of pixels in ways that the human eye cannot perceive.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-2xl font-medium flex items-center gap-3">
          <Binary className="text-accent" /> Least Significant Bit (LSB) Embedding
        </h2>
        <p className="text-textMain leading-relaxed">
          Digital images are made of pixels, and each pixel's color (Red, Green, Blue) is represented by an 8-bit number (0-255). 
          The Least Significant Bit (the 0th bit) contributes the least to the final color. By replacing this bit with the bits of a secret message, 
          an attacker can embed data without visually altering the image. 
        </p>
        <div className="bg-surfaceHighlight p-4 rounded-lg font-mono text-sm mt-2">
          Original Pixel: 10110110 (Value: 182) <br />
          Modified Pixel: 10110111 (Value: 183) &larr; Visually identical
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-2xl font-medium flex items-center gap-3">
          <BarChart className="text-warning" /> Statistical Steganalysis
        </h2>
        <p className="text-textMain leading-relaxed">
          While visually identical, modifying LSBs destroys the natural statistical properties of an image. StegoDetect AI uses multiple statistical attacks:
        </p>
        <ul className="list-disc list-inside space-y-2 text-textMuted ml-4">
          <li><strong>Chi-Square Attack:</strong> Analyzes Pairs of Values (PoVs). Natural images have specific frequencies for adjacent colors. LSB embedding equalizes these frequencies, dropping the Chi-Square p-value to near zero.</li>
          <li><strong>RS Steganalysis:</strong> Measures the spatial correlation of pixels. It classifies pixel blocks into Regular and Singular groups. Steganography disrupts this balance, allowing us to estimate the exact percentage of hidden data.</li>
        </ul>
      </section>

      <section className="card space-y-4 border-t-4 border-t-primary">
        <h2 className="text-2xl font-medium flex items-center gap-3">
          <Cpu className="text-primary" /> Machine Learning & CNN
        </h2>
        <p className="text-textMain leading-relaxed">
          Attackers use advanced algorithms to bypass classical statistical tests. To counter this, StegoDetect AI employs Artificial Intelligence.
        </p>
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="font-bold">Classical ML (Random Forest)</h3>
            <p className="text-textMuted text-sm">We extract 31 robust statistical features from the image and feed them into a Random Forest classifier to find complex, non-linear relationships that single statistical tests miss.</p>
          </div>
          <div>
            <h3 className="font-bold">Deep Learning (CNN)</h3>
            <p className="text-textMuted text-sm">We use a PyTorch Convolutional Neural Network. To prevent the CNN from looking at the "picture" (like a dog or a car), the first layer is a frozen Spatial Rich Model (SRM) High-Pass filter. This strips away image content, leaving only high-frequency noise residuals for the CNN to analyze.</p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 border-t-4 border-t-danger bg-danger/5">
        <h2 className="text-2xl font-medium flex items-center gap-3 text-danger">
          <Activity /> Limitations & Disclaimer
        </h2>
        <p className="text-textMain leading-relaxed">
          StegoDetect AI is a demonstration of forensic capabilities. Current model performance is based on a limited synthetic development dataset and should not be interpreted as real-world forensic accuracy for legal or critical security purposes.
        </p>
        <p className="text-textMuted">
          Additionally, highly compressed images (e.g., WhatsApp images) naturally destroy LSB data, making LSB-based steganography impossible but also rendering some statistical tests inconclusive.
        </p>
      </section>

    </div>
  );
}
