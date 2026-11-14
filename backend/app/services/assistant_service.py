"""
StegoShield AI — Global Forensic Assistant Service.
Provides context-aware conversational AI assistance across all application workflows.
Supports optional Gemini/OpenAI API keys or fallback to the built-in domain knowledge engine.
"""

import os
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import urllib.request
import json

from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, ChatMessage, ChatContext


class AssistantService:
    """Intelligent, context-aware chatbot service with deep StegoShield project knowledge."""

    @classmethod
    def get_suggested_prompts(cls, page: Optional[str], step: Optional[int]) -> List[str]:
        """Returns relevant prompt suggestions based on current route and workflow state."""
        route = (page or "").lower().strip("/")
        if "detector" in route:
            return [
                "How does the neural detector work?",
                "What is the difference between Cover and Stego?",
                "Explain the residual heatmap and FFT spectrum.",
                "How do I export an ISO/IEC 27037 certificate?",
            ]
        elif "lab" in route:
            if step == 2:
                return [
                    "How do I flip bits on this pixel?",
                    "What is an LSB (Least Significant Bit)?",
                    "How do bit modifications affect image quality?",
                ]
            elif step == 3:
                return [
                    "How does LSB message embedding work?",
                    "Can I protect my hidden message with a password?",
                    "How do I verify message extraction?",
                ]
            elif step == 4:
                return [
                    "What happens during StegoNet-Lite analysis?",
                    "Why does the neural net inspect high-frequency noise?",
                ]
            elif step == 5:
                return [
                    "Explain my complete analysis results.",
                    "What does PSNR (Peak Signal-to-Noise Ratio) mean?",
                    "What is the Chi-Square (χ²) test?",
                ]
            return [
                "Guide me through the 5-step forensic workflow.",
                "What kind of images can I upload?",
                "How do I detect concealed data?",
            ]
        elif "studio" in route:
            return [
                "What is the difference between LSB Replacement and LSB Matching (±1)?",
                "How much secret text can fit inside this carrier?",
                "How do I send this stego image directly to the Detector?",
            ]
        elif "history" in route:
            return [
                "What information is stored in the forensic ledger?",
                "How does SHA-256 guarantee chain-of-custody?",
                "How do I re-open and download past scan reports?",
            ]
        elif "profile" in route:
            return [
                "How do I set up Two-Factor Authentication (2FA)?",
                "What is RFC 6238 TOTP?",
                "How does session security protect my forensic scans?",
            ]
        elif "model" in route:
            return [
                "Explain the StegoNet-Lite architecture.",
                "What is BOSSbase 1.01?",
                "What is S-UNIWARD adaptive steganography?",
            ]
        return [
            "What can I do on StegoShield AI?",
            "How do I check an image for hidden data?",
            "How does the 5-step Forensic Lab work?",
            "What is digital image steganography?",
        ]

    @classmethod
    async def process_chat(cls, req: AssistantChatRequest) -> AssistantChatResponse:
        """Processes user inquiry with route context, active report findings, and domain knowledge."""
        user_msg = req.message.strip()
        context = req.context or ChatContext()
        current_page = (context.current_page or "dashboard").lower()
        workflow_step = context.workflow_step
        analysis_data = context.analysis_data or {}

        # 1. Check if external LLM API key is configured (Gemini or OpenAI)
        gemini_key = os.getenv("GEMINI_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if gemini_key:
            reply = await cls._call_gemini(gemini_key, user_msg, req.history, context)
            if reply:
                return AssistantChatResponse(
                    reply=reply,
                    suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

        if openai_key:
            reply = await cls._call_openai(openai_key, user_msg, req.history, context)
            if reply:
                return AssistantChatResponse(
                    reply=reply,
                    suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

        # 2. Built-in Local Forensic Knowledge Engine
        reply = cls._generate_expert_reply(user_msg, req.history, current_page, workflow_step, analysis_data)

        return AssistantChatResponse(
            reply=reply,
            suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def _generate_expert_reply(
        cls,
        query: str,
        history: List[ChatMessage],
        page: str,
        step: Optional[int],
        analysis: Dict[str, Any]
    ) -> str:
        """Generates domain-expert response based on query keywords and contextual application state."""
        q = query.lower()

        # Context-specific: User asking about active image analysis or results
        if any(w in q for w in ["this image", "my image", "the result", "this result", "the verdict", "safe", "findings", "report", "what did you find", "is it clean"]):
            if analysis:
                verdict = analysis.get("verdict", "Cover Indicated")
                conf = analysis.get("confidence")
                conf_str = f"{(conf * 100):.1f}%" if conf else "high"
                psnr = analysis.get("psnr_db") if analysis.get("psnr_db") is not None else analysis.get("psnr")
                psnr_str = f"{psnr:.2f} dB" if psnr is not None else "N/A"
                changed = analysis.get("changed_pixels", 0)
                rate = analysis.get("changed_percent") if analysis.get("changed_percent") is not None else analysis.get("change_pct", 0.0)
                file_hash = analysis.get("file_hash") or analysis.get("sha256_hash") or analysis.get("modified_hash") or analysis.get("original_hash") or "Available"

                is_stego = "stego" in verdict.lower()
                response = f"### 🔍 Analysis Breakdown for Your Active Carrier\n\n"
                response += f"- **Forensic Verdict**: `{verdict}` ({conf_str} confidence)\n"
                if is_stego:
                    response += f"- **Assessment**: The neural model detected high-frequency spatial residual deviations consistent with hidden data embedding.\n"
                else:
                    response += f"- **Assessment**: The carrier matches natural photographic noise distributions with zero anomalous residual spikes.\n"

                if psnr is not None or changed > 0:
                    response += f"\n**Quantitative Differential Evidence:**\n"
                    response += f"- **Changed Pixels**: `{changed:,} px` ({rate}% alteration rate)\n"
                    response += f"- **Fidelity (PSNR)**: `{psnr_str}` (Values > 50 dB are visually imperceptible)\n"

                if file_hash and file_hash != "Available":
                    response += f"- **SHA-256 Digest**: `{file_hash[:16]}...`\n"

                response += "\n*Tip: You can export a formal ISO/IEC 27037 chain-of-custody PDF certificate using the **Print Certificate** button.*"
                return response

        # Page-Specific Explanations
        if any(w in q for w in [
            "what page", "explain page", "how to use", "how do i use", "use this page", "work this page",
            "where am i", "help me here", "guide me", "how does this work", "instructions", "workflow", "what can i do here"
        ]):
            if "detector" in page:
                return (
                    "### 🛡️ StegoShield Detector Overview\n\n"
                    "The **Detector** is our automated neural steganalysis suite. Here is how to use it:\n\n"
                    "1. **Upload an Image**: Drag-and-drop or select any PNG, BMP, or JPG carrier.\n"
                    "2. **Neural Inference**: StegoNet-Lite processes high-pass residual energy through 12 convolutional layers calibrated against BOSSbase 1.01.\n"
                    "3. **Inspect Evidence**:\n"
                    "   - **Residual Variance Heatmap**: Visualizes high-frequency noise hotspots.\n"
                    "   - **Bit-Plane 0 (LSB)**: Displays the raw spatial bitstream.\n"
                    "   - **2D Fourier Spectrum (FFT)**: Shows high-frequency spectral distortion.\n"
                    "   - **Statistical Steganalysis Suite**: Provides mathematical proof via Chi-Square (χ²), Sample Pair Analysis (SPA), and RS Steganalysis.\n"
                    "4. **Export**: Click **Print / Save PDF** for an ISO/IEC 27037 forensic certificate."
                )
            elif "lab" in page:
                step_focus = f"\n\n👉 **Your Current Step**: Step {step} — " if step else ""
                if step == 1:
                    step_focus += "**Upload Image**: Ingest an uncompressed reference image to establish the baseline SHA-256 fingerprint."
                elif step == 2:
                    step_focus += "**Modify Bits**: Click any pixel coordinate on the interactive canvas and toggle individual bit registers to simulate micro-tampering."
                elif step == 3:
                    step_focus += "**Add Hidden Message**: Enter secret plaintext to embed it into carrier LSBs with optional AES-256 passkey encryption."
                elif step == 4:
                    step_focus += "**Run Steganalysis**: Subject your modified carrier to the StegoNet-Lite neural detector and differential calculations."
                elif step == 5:
                    step_focus += "**Complete Analysis Results**: Review the full forensic dossier including PSNR, changed pixel count, and differential heatmaps."

                return (
                    "### 🔬 StegoShield Forensic Laboratory (5-Step Pipeline)\n\n"
                    "The Forensic Lab is an interactive sequential workstation:\n\n"
                    "- **Step 1 — Upload Image**: Ingest an uncompressed reference image and establish baseline SHA-256 hash and entropy.\n"
                    "- **Step 2 — Modify Bits**: Click anywhere on the canvas to inspect coordinates $(X, Y)$, read RGB bytes, and flip discrete bits on the 8-bit register.\n"
                    "- **Step 3 — Add Hidden Message**: Conceal arbitrary secret text into carrier LSBs with optional AES-256 password encryption.\n"
                    "- **Step 4 — Run Steganalysis**: Subject the resulting carrier to StegoNet-Lite CNN inference and differential comparison.\n"
                    "- **Step 5 — Complete Analysis Results**: Inspect changed pixel counts, PSNR, Hamming distance, curtain wipe sliders, and differential heatmaps."
                    + step_focus
                )
            elif "studio" in page:
                return (
                    "### 🔐 Steganography Studio Overview\n\n"
                    "**Stego Studio** allows you to conceal and recover secret messages:\n\n"
                    "- **Conceal Message Mode**:\n"
                    "  - **Spatial LSB Replacement**: Directly substitutes the least significant bit. Fast and classical.\n"
                    "  - **Spatial LSB Matching (±1)**: Symmetrically adds or subtracts 1 to evade Pairs of Values (PoV) attacks.\n"
                    "  - **AES-256 Passkey**: Cryptographically seals the text payload before embedding.\n"
                    "- **Extract Secret Mode**: Upload a suspect stego image and enter the passkey to extract the hidden text.\n"
                    "- **Direct Pipeline**: Click **Evaluate in Detector** to test how easily your created stego image is caught!"
                )
            elif "history" in page:
                return (
                    "### 📋 Forensic Audit Ledger (History)\n\n"
                    "This page maintains an immutable record of all forensic examinations:\n\n"
                    "- **Audit Trail**: Every scan logs carrier filename, dimensions, SHA-256 fingerprint, verdict, and confidence score.\n"
                    "- **Re-Verification**: Click on any past entry to reload the full differential heatmap and cryptographic details.\n"
                    "- **Chain of Custody**: Compliant with ISO/IEC 27037:2012 guidelines for digital evidence admissibility."
                )

        # Technical Topics: LSB & Steganography
        if any(w in q for w in ["what is lsb", "how does lsb work", "least significant bit"]):
            return (
                "### 🧩 What is LSB (Least Significant Bit) Steganography?\n\n"
                "In an 8-bit digital image, each color channel (Red, Green, Blue) has values from `0` to `255` represented in 8 binary bits:\n\n"
                "`[b7, b6, b5, b4, b3, b2, b1, b0]`\n\n"
                "- **Bit 7 (MSB)** carries **50% of the visual intensity** (value 128). Modifying it drastically alters image colors.\n"
                "- **Bit 0 (LSB)** carries only **0.39% of the visual intensity** (value 1). Flipping it alters the pixel value by only ±1, which is completely imperceptible to the human eye.\n\n"
                "**How embedding works:**\n"
                "Text messages are converted into binary ASCII bits. Each secret bit replaces the LSB of consecutive carrier pixels. StegoShield AI detects this by identifying unnatural statistical equalization in the image's high-frequency noise residuals."
            )

        # Technical Topics: PSNR
        if "psnr" in q or "peak signal" in q:
            return (
                "### 📊 What is PSNR (Peak Signal-to-Noise Ratio)?\n\n"
                "**PSNR** measures the visual fidelity between an original cover image and a modified stego carrier, expressed in decibels ($dB$):\n\n"
                "$$\\text{PSNR} = 10 \\cdot \\log_{10}\\left(\\frac{255^2}{\\text{MSE}}\\right)$$\n\n"
                "- **PSNR > 50 dB**: Excellent fidelity. Modifications are completely imperceptible to human vision.\n"
                "- **PSNR 40 – 50 dB**: High fidelity typical of low-payload LSB embedding (0.1 to 0.4 bpp).\n"
                "- **PSNR < 35 dB**: Noticeable degradation or heavy payload tampering.\n\n"
                "*Note: While high PSNR indicates an invisible embedding to humans, StegoShield's neural networks detect the spatial noise residual regardless of visual transparency.*"
            )

        # Technical Topics: Chi-Square
        if "chi-square" in q or "chi square" in q or "pov" in q:
            return (
                "### 📈 Chi-Square (χ²) Steganalysis Attack\n\n"
                "Pioneered by Westfeld & Pfitzmann, the **Chi-Square Attack** exploits **Pairs of Values (PoVs)**:\n\n"
                "1. In a natural, unaltered image, adjacent even and odd pixel intensities $(2k, 2k+1)$ naturally differ in frequency due to scene geometry.\n"
                "2. When pseudo-random secret bits are embedded via spatial LSB replacement, the frequencies of $(2k, 2k+1)$ artificially equalize ($n_{2k} \\approx n_{2k+1}$).\n"
                "3. The Chi-Square test measures this artificial symmetry: when the Chi-Square statistic drops below normal variance, **steganography is mathematically proven** with $p$-value metrics."
            )

        # Technical Topics: S-UNIWARD
        if "s-uniward" in q or "uniward" in q or "adaptive" in q:
            return (
                "### 🌊 What is S-UNIWARD Steganography?\n\n"
                "**S-UNIWARD** (*Spatial Universal Wavelet Relative Distortion*) is state-of-the-art content-adaptive steganography:\n\n"
                "- **The Principle**: Instead of embedding data uniformly across smooth surfaces (sky, smooth walls) where modifications are easy to detect, S-UNIWARD places changes **preferentially in complex, noisy, high-frequency textures** (foliage, hair, stone).\n"
                "- **Wavelet Decomposition**: It uses 2D directional Daubechies wavelet filter banks (Horizontal, Vertical, Diagonal) to evaluate relative distortion costs.\n"
                "- **Detection in StegoShield**: Standard Chi-Square attacks fail against S-UNIWARD, which is why StegoShield incorporates **StegoNet-Lite (SRNet)** deep residual networks to detect subtle wavelet cost shifts."
            )

        # Technical Topics: 2FA / Authentication
        if any(w in q for w in ["2fa", "mfa", "authenticator", "totp", "two-factor"]):
            return (
                "### 🔒 Two-Factor Authentication (2FA) in StegoShield\n\n"
                "StegoShield AI supports enterprise-grade **RFC 6238 TOTP Two-Factor Authentication**:\n\n"
                "1. Go to your **Profile** (`/profile`).\n"
                "2. In the **Two-Factor Authentication** card, click **Enable 2FA**.\n"
                "3. Scan the generated QR code using **Google Authenticator**, **Authy**, or **1Password** (or copy the base32 secret key).\n"
                "4. Enter the 6-digit code to activate your encrypted vault.\n\n"
                "Once activated, every subsequent sign-in requires your secondary one-time code, safeguarding your forensic case history against credential theft."
            )

        # General Steganography definition
        if any(w in q for w in ["what is steganography", "what is steganalysis", "how does steganalysis work"]):
            return (
                "### 🛡️ Steganography vs. Steganalysis\n\n"
                "- **Steganography** (*Covert Writing*): The art and science of hiding confidential information inside ordinary cover carriers (such as images, audio, or video) so that the existence of the message is concealed from eavesdroppers.\n"
                "- **Steganalysis**: The defensive counter-discipline of discovering, detecting, and analyzing hidden data within suspect digital carriers.\n\n"
                "**How StegoShield AI Works:**\n"
                "StegoShield uses deep residual neural networks (**StegoNet-Lite** inspired by SRNet) alongside classical mathematical suites (Chi-Square, Sample Pair Analysis, RS Steganalysis) to identify microscopic pixel modifications that are completely invisible to the human eye."
            )

        # Fallback guidance
        return (
            "### 🤖 StegoShield AI Forensic Assistant\n\n"
            f"I am actively monitoring your session on the **{page.strip('/').title() or 'Dashboard'}** workspace.\n\n"
            "Here is how I can assist you right now:\n\n"
            "- **Walkthroughs**: Ask *\"How do I use this page?\"* or *\"Guide me through the Forensic Lab\"*.\n"
            "- **Forensic Explanations**: Ask *\"What is PSNR?\"*, *\"Explain LSB embedding\"*, or *\"What is Chi-Square?\"*.\n"
            "- **Live Analysis Inquiries**: Ask *\"Explain my current image results\"* and I will analyze your active carrier data.\n"
            "- **Account Security**: Ask *\"How do I enable 2FA?\"* for step-by-step guidance.\n\n"
            "What would you like to explore?"
        )

    @classmethod
    async def _call_gemini(cls, api_key: str, query: str, history: List[ChatMessage], ctx: ChatContext) -> Optional[str]:
        """Optional caller for Google Gemini API if configured."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            system_instruction = (
                "You are the StegoShield AI Forensic Assistant, an expert digital image forensics and neural steganalysis advisor. "
                "Explain concepts clearly, beginner-friendly first, with deep mathematical rigor on demand. "
                f"Current Page: {ctx.current_page or 'Dashboard'}. Current Step: {ctx.workflow_step or 'N/A'}. "
                f"Active Analysis Context: {json.dumps(ctx.analysis_data or {})}. Never fabricate forensic evidence."
            )

            contents = []
            for h in (history or [])[-6:]:
                contents.append({
                    "role": "user" if h.role == "user" else "model",
                    "parts": [{"text": h.content}]
                })
            contents.append({"role": "user", "parts": [{"text": query}]})

            payload = json.dumps({
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": contents,
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1000}
            }).encode("utf-8")

            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode())
                return res_data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return None

    @classmethod
    async def _call_openai(cls, api_key: str, query: str, history: List[ChatMessage], ctx: ChatContext) -> Optional[str]:
        """Optional caller for OpenAI API if configured."""
        try:
            url = "https://api.openai.com/v1/chat/completions"
            messages = [{
                "role": "system",
                "content": (
                    "You are the StegoShield AI Forensic Assistant, an expert digital image forensics and neural steganalysis advisor. "
                    f"Current Page: {ctx.current_page or 'Dashboard'}. Active Step: {ctx.workflow_step or 'N/A'}. "
                    f"Active Analysis Data: {json.dumps(ctx.analysis_data or {})}. Never fabricate forensic evidence."
                )
            }]
            for h in (history or [])[-6:]:
                messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": query})

            payload = json.dumps({
                "model": "gpt-4o-mini",
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 800
            }).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode())
                return res_data["choices"][0]["message"]["content"]
        except Exception:
            return None
