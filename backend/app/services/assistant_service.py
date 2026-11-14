"""
StegoShield AI — Global Forensic Assistant Service.
Provides context-aware conversational AI assistance across all application workflows.
Supports optional Gemini/OpenAI API keys or fallback to the built-in domain knowledge engine.
"""

import os
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import urllib.request
import urllib.error
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
                "Why is this image considered suspicious?",
                "Explain the Chi-Square (χ²) and RS analysis results.",
                "What is the difference between Cover and Stego?",
                "How do I export an ISO/IEC 27037 certificate?",
            ]
        elif "lab" in route:
            if step == 2:
                return [
                    "How do I modify image bits?",
                    "What is an LSB (Least Significant Bit)?",
                    "What should I do next in Step 2?",
                ]
            elif step == 3:
                return [
                    "How does LSB message embedding work?",
                    "Can I protect my hidden message with an AES password?",
                    "What should I do next in Step 3?",
                ]
            elif step == 4:
                return [
                    "What happens during StegoNet-Lite analysis?",
                    "Why does the neural net inspect high-frequency noise?",
                    "What should I do next?",
                ]
            elif step == 5:
                return [
                    "Explain my complete analysis results.",
                    "Why was this image classified this way?",
                    "What does PSNR (Peak Signal-to-Noise Ratio) mean?",
                ]
            return [
                "Guide me through the 5-step forensic workflow.",
                "How do I modify image bits?",
                "What should I do next?",
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
            "What is steganography?",
            "What is an LSB?",
            "How do I modify image bits?",
            "What should I do next?",
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
            reply, err = await cls._call_gemini(gemini_key, user_msg, req.history, context)
            if reply:
                return AssistantChatResponse(
                    reply=reply,
                    suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            if err:
                # Inform user of external provider failure, then provide built-in expert reply
                builtin_fallback = cls._generate_expert_reply(user_msg, req.history, current_page, workflow_step, analysis_data)
                return AssistantChatResponse(
                    reply=f"⚠️ **AI Provider Notice**: {err}\n\n---\n\n{builtin_fallback}",
                    suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

        if openai_key:
            reply, err = await cls._call_openai(openai_key, user_msg, req.history, context)
            if reply:
                return AssistantChatResponse(
                    reply=reply,
                    suggested_prompts=cls.get_suggested_prompts(current_page, workflow_step),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            if err:
                builtin_fallback = cls._generate_expert_reply(user_msg, req.history, current_page, workflow_step, analysis_data)
                return AssistantChatResponse(
                    reply=f"⚠️ **AI Provider Notice**: {err}\n\n---\n\n{builtin_fallback}",
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

        # ---------------------------------------------------------------------
        # 1. EXPLAIN FORENSIC RESULTS / WHY IS THIS SUSPICIOUS / EVIDENCE AUDIT
        # ---------------------------------------------------------------------
        if any(w in q for w in [
            "why is this image suspicious", "why suspicious", "suspicious", "what did you find",
            "explain results", "explain result", "explain my result", "what does this mean",
            "what does this analysis mean", "the verdict", "is it clean", "findings",
            "evidence", "breakdown", "this image", "my image", "the result", "this result",
            "why was this classified", "classify"
        ]):
            if analysis and any(k in analysis for k in ["verdict", "confidence", "statistical_metrics", "statistical_tests", "psnr", "changed_pixels"]):
                verdict = analysis.get("verdict", "Cover Indicated")
                conf = analysis.get("confidence")
                conf_str = f"{(conf * 100):.1f}%" if conf is not None else "High"
                cov_prob = analysis.get("cover_probability")
                stego_prob = analysis.get("stego_probability")
                cov_str = f"{(cov_prob * 100):.1f}%" if cov_prob is not None else "N/A"
                stego_str = f"{(stego_prob * 100):.1f}%" if stego_prob is not None else "N/A"

                psnr = analysis.get("psnr_db") if analysis.get("psnr_db") is not None else analysis.get("psnr")
                psnr_str = f"{psnr:.2f} dB" if psnr is not None else "N/A"
                changed = analysis.get("changed_pixels", 0)
                rate = analysis.get("changed_percent") if analysis.get("changed_percent") is not None else analysis.get("change_pct", 0.0)
                file_hash = (
                    analysis.get("file_hash")
                    or analysis.get("sha256_hash")
                    or analysis.get("modified_hash")
                    or analysis.get("original_hash")
                    or "Available"
                )

                stat_metrics = analysis.get("statistical_metrics") or {}
                stat_tests = analysis.get("statistical_tests") or {}

                chi_sq = stat_metrics.get("chi_square") or (stat_tests.get("chi_square") or {}).get("statistic")
                p_val = stat_metrics.get("p_value") or (stat_tests.get("chi_square") or {}).get("p_value")
                entropy = stat_metrics.get("entropy") or stat_metrics.get("entropy_shannon")
                res_var = stat_metrics.get("residual_variance") or stat_metrics.get("residual_energy")
                lsb_ratio = stat_metrics.get("lsb_ratio")
                rs_data = stat_tests.get("rs_analysis") or {}

                is_stego = "stego" in str(verdict).lower()
                is_inconclusive = "inconclusive" in str(verdict).lower() or (conf is not None and conf < 0.65)

                res = f"### 🔍 Detailed Forensic Examination Breakdown\n\n"
                res += f"**Primary Classification**: `{verdict}` ({conf_str} confidence)\n"
                res += f"- **Posterior Probabilities**: $P(\\text{{Stego}}) = {stego_str}$ &bull; $P(\\text{{Cover}}) = {cov_str}$\n\n"

                res += "**Available Forensic Evidence:**\n"
                if chi_sq is not None or p_val is not None:
                    chi_str = f"{chi_sq:.2f}" if isinstance(chi_sq, (int, float)) else str(chi_sq)
                    p_str = f"{p_val:.4f}" if isinstance(p_val, (int, float)) else str(p_val)
                    chi_eval = "Equalized even/odd histogram pairs (anomalous symmetry)" if (isinstance(p_val, (int, float)) and p_val < 0.05) else "Natural PoV variance preserved"
                    res += f"- **Chi-Square (χ²) PoV Test**: Statistic `{chi_str}`, $p$-value `{p_str}` &rarr; *{chi_eval}*.\n"

                if rs_data and isinstance(rs_data, dict):
                    rm = rs_data.get("rm", rs_data.get("r_m"))
                    sm = rs_data.get("sm", rs_data.get("s_m"))
                    rs_verdict = rs_data.get("verdict", "Evaluated")
                    res += f"- **RS Steganalysis**: Regular vs Singular group relationship &rarr; *{rs_verdict}* (Rm: {rm}, Sm: {sm}).\n"

                if entropy is not None:
                    res += f"- **Shannon Entropy**: `{entropy:.3f} bits/symbol` (Information density across pixel intensity channels).\n"

                if res_var is not None:
                    res += f"- **Spatial Residual Variance**: `{res_var:.2f} σr²` (High-pass Laplacian noise energy).\n"

                if lsb_ratio is not None:
                    res += f"- **Bitplane 0 (LSB) Distribution**: `{lsb_ratio * 100:.1f}%` ones (Equalization near 50.0% is characteristic of pseudorandom payloads).\n"

                if psnr is not None or (isinstance(changed, int) and changed > 0):
                    res += f"- **Differential Carrier Metrics**: `{changed:,} px` ({rate}% alteration rate), PSNR: `{psnr_str}`.\n"

                if file_hash != "Available":
                    res += f"- **Cryptographic SHA-256**: `{file_hash[:16]}...`\n"

                res += "\n**Evidence Synthesis:**\n"
                if is_inconclusive:
                    res += (
                        "- **Status**: `Inconclusive / Low Confidence`.\n"
                        "- **Explanation**: The statistical indicators and neural residual features show borderline values. "
                        "Heavily textured image areas or standard camera noise compression can produce elevated residuals without secret data.\n"
                    )
                elif is_stego:
                    res += (
                        "- **Evidence Suggesting Steganography**: Elevated spatial noise residuals and structural bitplane distortion "
                        "detected by the StegoNet-Lite CNN filter bank, consistent with LSB or adaptive payload insertion.\n"
                    )
                else:
                    res += (
                        "- **Evidence Suggesting Normal Cover**: The carrier conforms to natural camera sensor noise distributions. "
                        "Histogram frequencies and wavelet directional costs exhibit no synthetic flattening or residual anomalies.\n"
                    )

                res += (
                    "\n> [!IMPORTANT]\n"
                    "> **Legal / Forensic Notice**: Statistical and neural steganalysis tests indicate *probabilistic anomalies*. "
                    "They provide strong investigative leads, but legally conclusive proof of hidden content requires cryptographic extraction or secret key recovery."
                )
                return res

            else:
                return (
                    "### 🔍 What Makes an Image Suspicious in Steganalysis?\n\n"
                    "Steganalysis tools examine features invisible to human vision to detect concealed data:\n\n"
                    "1. **High-Frequency Noise Residuals**: Natural photographic images have smooth spatial gradients. Embedding modifications (even $\\pm 1$) create sharp artificial noise spikes caught by high-pass Laplacian filters.\n"
                    "2. **Pairs of Values (PoV) Symmetry (Chi-Square)**: Natural images have uneven counts of adjacent even/odd pixel values $(2k, 2k+1)$. LSB embedding equalizes these frequencies into an unnatural symmetry.\n"
                    "3. **RS Steganalysis Asymmetry**: Measures the relative count of Regular ($R$) and Singular ($S$) pixel blocks under dual-state flipping masks. Natural images maintain $R_m \\approx R_{-m} > S_m \\approx S_{-m}$; LSB embedding causes them to cross over.\n"
                    "4. **Bitplane 0 Entropy**: The least significant bit plane of a clean image retains faint image geometry. Stego carriers display completely uniform, white-noise randomness in bitplane 0.\n\n"
                    "*Upload an image in the **Detector** or run Step 4 in the **Forensics Lab** to analyze your carrier's actual metrics.*"
                )

        # ---------------------------------------------------------------------
        # 2. HOW DO I MODIFY IMAGE BITS?
        # ---------------------------------------------------------------------
        if any(w in q for w in [
            "how do i modify", "modify bits", "modify image bits", "how to modify bits",
            "how to modify", "bit modification", "flip bit", "toggle bit", "change bit",
            "set bit", "clear bit", "how do i change pixels"
        ]):
            return (
                "### 🛠️ How to Modify Image Bits in the Forensics Lab\n\n"
                "You can inspect and alter individual pixel bits with byte-level fidelity:\n\n"
                "1. **Navigate to Forensic Lab**: Go to `/lab` and proceed to **Step 2: Modify Bits**.\n"
                "2. **Select Target Pixel**:\n"
                "   - **By Canvas Click**: Click directly on any pixel coordinate in the interactive image canvas.\n"
                "   - **By Coordinate Jump**: Type exact numerical $X$ and $Y$ coordinates into the **Coordinate** inputs and click **Inspect** (or press Enter).\n"
                "3. **Choose Operation Mode**:\n"
                "   - `Toggle (Flip)`: Inverts the bit ($0 \\to 1$ or $1 \\to 0$).\n"
                "   - `Set (1)`: Forces the bit to 1.\n"
                "   - `Clear (0)`: Forces the bit to 0.\n"
                "4. **Click Individual Bit Register**:\n"
                "   - In the right-hand panel, inspect the 8-bit registers for Red, Green, and Blue channels.\n"
                "   - Click any bit button: `b0` (LSB, altering pixel value by $\\pm 1$) up to `b7` (MSB, altering pixel value by $\\pm 128$).\n"
                "5. **Real Image Buffer Updated Immediately**:\n"
                "   - The backend modifies the raw NumPy array in memory and generates a new lossless PNG base64.\n"
                "   - The canvas redraws with the altered pixel, and the **Bit Delta Audit** card shows before/after byte values and signed difference ($\\Delta$).\n"
                "6. **Download or Continue**:\n"
                "   - Click **Download Carrier (PNG)** to export the modified file.\n"
                "   - Click **Continue to Next Step** to embed a secret message in Step 3 or test detection in Step 4."
            )

        # ---------------------------------------------------------------------
        # 3. WHAT SHOULD I DO NEXT?
        # ---------------------------------------------------------------------
        if any(w in q for w in ["what should i do next", "what to do next", "what next", "next step", "what should i do", "guide me next"]):
            if "lab" in page:
                if step == 1:
                    return (
                        "### 👉 Next Steps for Step 1: Upload Image\n\n"
                        "1. Drag and drop any PNG, BMP, or PGM image, or click **Load BOSSbase Cover** for an instant pre-calibrated reference.\n"
                        "2. Review the baseline SHA-256 fingerprint, Shannon entropy, and dimensions.\n"
                        "3. Click **Continue to Next Step** to enter Step 2 (Modify Bits)."
                    )
                elif step == 2:
                    return (
                        "### 👉 Next Steps for Step 2: Modify Bits\n\n"
                        "1. Click a coordinate on the canvas or enter $(X, Y)$ coordinates to select a pixel.\n"
                        "2. Click `b0` to flip the Least Significant Bit (LSB) or try other bits to simulate tampering.\n"
                        "3. Review the **Bit Delta Audit** card to verify the change in pixel value.\n"
                        "4. When finished, click **Continue to Next Step** to embed a hidden message in Step 3."
                    )
                elif step == 3:
                    return (
                        "### 👉 Next Steps for Step 3: Add Hidden Message\n\n"
                        "1. Enter secret text in the payload message box.\n"
                        "2. (Optional) Provide an AES-256 passkey for cryptographic encryption.\n"
                        "3. Click **Embed Message into LSB** to substitute carrier bitstreams.\n"
                        "4. Click **Continue to Next Step** to evaluate detection in Step 4."
                    )
                elif step == 4:
                    return (
                        "### 👉 Next Steps for Step 4: Run Steganalysis\n\n"
                        "1. Click **Execute StegoNet-Lite Inference** to filter your carrier through convolutional high-pass kernels.\n"
                        "2. Wait for the model forward pass and differential metrics calculation to finish.\n"
                        "3. Click **View Complete Results** to inspect the full findings dossier in Step 5."
                    )
                elif step == 5:
                    return (
                        "### 👉 Next Steps for Step 5: Complete Analysis Results\n\n"
                        "1. Review the **Forensic Verdict** and confidence score.\n"
                        "2. Inspect the **Curtain Wipe Slider**, **8x Loupe**, and **Differential Heatmap** exhibits.\n"
                        "3. Click **Print Forensic Certificate** to export an audit-ready ISO/IEC 27037 chain-of-custody PDF certificate."
                    )
                return (
                    "### 👉 Recommended Next Action in Forensic Lab\n\n"
                    "You are in the 5-step interactive Forensic Lab. Follow the numbered steps across the top bar: "
                    "`01 Upload` &rarr; `02 Modify Bits` &rarr; `03 Add Message` &rarr; `04 Steganalysis` &rarr; `05 Results`."
                )
            elif "detector" in page:
                return (
                    "### 👉 Recommended Next Action in Detector\n\n"
                    "1. Upload an uncompressed image (PNG, BMP, JPG) into the main drop zone.\n"
                    "2. The system automatically computes StegoNet-Lite neural predictions, Chi-Square, and RS tests.\n"
                    "3. Click **Quick Triage** buttons to switch between Residual Heatmap, Bitplane 0, and FFT spectrum."
                )
            elif "studio" in page:
                return (
                    "### 👉 Recommended Next Action in Stego Studio\n\n"
                    "1. Upload a cover image and select **Conceal Secret Message**.\n"
                    "2. Choose **Spatial LSB Replacement** (standard) or **LSB Matching (±1)** (evasive).\n"
                    "3. Click **Evaluate in Detector** to test whether StegoNet-Lite can detect your stego carrier."
                )
            return (
                "### 👉 What Should You Do Next?\n\n"
                "- To test an existing image for hidden data: Go to the **Detector** (`/detector`).\n"
                "- To experiment with pixel bits and LSB concealment hands-on: Go to the **Forensic Lab** (`/lab`).\n"
                "- To embed or extract custom text messages: Go to **Stego Studio** (`/stego-studio`)."
            )

        # ---------------------------------------------------------------------
        # 4. TECHNICAL TOPICS: LSB, STEGANOGRAPHY, PSNR, CHI-SQUARE, S-UNIWARD
        # ---------------------------------------------------------------------
        if any(w in q for w in ["what is lsb", "how does lsb work", "least significant bit"]):
            return (
                "### 🧩 What is LSB (Least Significant Bit) Steganography?\n\n"
                "In standard 8-bit digital images, every color channel (Red, Green, Blue) has values between `0` and `255`, encoded in 8 binary bits:\n\n"
                "$$\\text{Byte} = [b_7, b_6, b_5, b_4, b_3, b_2, b_1, b_0]$$\n\n"
                "- **Bit 7 (MSB — Most Significant Bit)**: Carries $2^7 = 128$ (50% of the visual intensity). Altering it causes obvious visual discoloration.\n"
                "- **Bit 0 (LSB — Least Significant Bit)**: Carries $2^0 = 1$ (0.39% of visual intensity). Flipping it alters the pixel value by only $\\pm 1$, which is completely invisible to human vision.\n\n"
                "**How embedding works:**\n"
                "Text messages are serialized into binary bitstreams. Each secret bit replaces the LSB ($b_0$) of consecutive image pixels. "
                "StegoShield AI catches this because pseudo-random message bits destroy natural statistical correlations between adjacent pixels."
            )

        if any(w in q for w in ["what is steganography", "what is steganalysis"]):
            return (
                "### 🛡️ What is Steganography vs. Steganalysis?\n\n"
                "- **Steganography** (*Covert Writing*): The practice of concealing a secret message, file, or image within another ordinary file (such as a photo, audio track, or video) so that an outside observer does not even suspect that communication is taking place.\n"
                "- **Steganalysis**: The defensive counter-discipline of inspecting digital media to detect, isolate, and extract concealed steganographic payloads.\n\n"
                "**StegoShield AI's Multi-Tier Pipeline:**\n"
                "1. **Neural Steganalysis**: StegoNet-Lite (inspired by SRNet) applies 12 convolutional residual layers to capture micro-texture noise shifts.\n"
                "2. **Statistical Proof**: Chi-Square PoV tests, Sample Pair Analysis (SPA), and RS Steganalysis provide mathematical evidence.\n"
                "3. **Visual & Frequency Forensics**: Residual energy heatmaps, 2D Fourier (FFT) spectrums, and bitplane slicing expose structural tampering."
            )

        if "psnr" in q or "peak signal" in q:
            return (
                "### 📊 What is PSNR (Peak Signal-to-Noise Ratio)?\n\n"
                "**PSNR** measures the visual fidelity between an original cover image and a modified stego carrier in decibels ($dB$):\n\n"
                "$$\\text{PSNR} = 10 \\cdot \\log_{10}\\left(\\frac{255^2}{\\text{MSE}}\\right)$$\n\n"
                "- **PSNR > 50 dB**: High fidelity. Changes are imperceptible to human eyes.\n"
                "- **PSNR 40 – 50 dB**: Typical for low-payload LSB embedding (0.1 to 0.4 bpp).\n"
                "- **PSNR < 35 dB**: Visual distortion or aggressive tampering.\n\n"
                "*Note: High PSNR guarantees invisibility to humans, but neural residual detectors like StegoNet-Lite inspect high-frequency noise variance regardless of visual transparency.*"
            )

        if "chi-square" in q or "chi square" in q or "pov" in q:
            return (
                "### 📈 Chi-Square (χ²) Steganalysis Attack\n\n"
                "Developed by Westfeld & Pfitzmann, the **Chi-Square Attack** exploits **Pairs of Values (PoVs)**:\n\n"
                "1. In clean natural images, frequencies of adjacent even and odd pixel values $(2k, 2k+1)$ vary naturally according to scene lighting.\n"
                "2. When pseudorandom secret bits are substituted into LSBs, the counts of $(2k, 2k+1)$ artificially equalize ($n_{2k} \\approx n_{2k+1}$).\n"
                "3. The Chi-Square test computes deviations across all $128$ PoVs. When $p < 0.05$, there is strong mathematical evidence of LSB steganography."
            )

        if "s-uniward" in q or "uniward" in q or "adaptive" in q:
            return (
                "### 🌊 What is S-UNIWARD Steganography?\n\n"
                "**S-UNIWARD** (*Spatial Universal Wavelet Relative Distortion*) is state-of-the-art content-adaptive steganography:\n\n"
                "- **Adaptive Principle**: Avoids smooth regions (sky, uniform walls) and concentrates modifications in complex, noisy textures (hair, leaves, stone).\n"
                "- **Wavelet Cost Evaluation**: Evaluates relative distortion using 2D directional Daubechies wavelet filter banks.\n"
                "- **StegoShield Detection**: Standard Chi-Square attacks fail against S-UNIWARD, so StegoShield uses **StegoNet-Lite (SRNet)** deep residual networks to detect wavelet cost anomalies."
            )

        if any(w in q for w in ["2fa", "mfa", "authenticator", "totp", "two-factor"]):
            return (
                "### 🔒 Two-Factor Authentication (2FA) in StegoShield\n\n"
                "StegoShield AI supports enterprise-grade **RFC 6238 TOTP Two-Factor Authentication**:\n\n"
                "1. Go to your **Profile** (`/profile`).\n"
                "2. Click **Enable 2FA** in the Security settings.\n"
                "3. Scan the QR code using Google Authenticator, Authy, or 1Password.\n"
                "4. Enter the 6-digit code to activate your encrypted vault.\n\n"
                "Once enabled, logins require your secondary one-time code, ensuring chain-of-custody integrity."
            )

        # ---------------------------------------------------------------------
        # 5. PAGE-SPECIFIC GUIDES
        # ---------------------------------------------------------------------
        if any(w in q for w in [
            "what page", "explain page", "how to use", "how do i use", "use this page", "work this page",
            "where am i", "help me here", "guide me", "how does this work", "instructions", "workflow", "what can i do here"
        ]):
            if "detector" in page:
                return (
                    "### 🛡️ StegoShield Detector Overview\n\n"
                    "The **Detector** is our automated neural steganalysis suite:\n\n"
                    "1. **Upload an Image**: Drag-and-drop any PNG, BMP, or JPG carrier.\n"
                    "2. **Neural Inference**: StegoNet-Lite processes high-pass residual energy through 12 convolutional layers calibrated against BOSSbase 1.01.\n"
                    "3. **Inspect Evidence**:\n"
                    "   - **Residual Variance Heatmap**: Visualizes high-frequency noise hotspots.\n"
                    "   - **Bit-Plane 0 (LSB)**: Displays the raw spatial bitstream.\n"
                    "   - **2D Fourier Spectrum (FFT)**: Shows frequency spectral distortion.\n"
                    "   - **Statistical Steganalysis Suite**: Provides proof via Chi-Square (χ²), SPA, and RS Steganalysis.\n"
                    "4. **Export**: Click **Print / Save PDF** for an ISO/IEC 27037 forensic certificate."
                )
            elif "lab" in page:
                step_focus = f"\n\n👉 **Your Active Step**: Step {step} — " if step else ""
                if step == 1:
                    step_focus += "**Upload Image**: Establish the reference baseline SHA-256 fingerprint."
                elif step == 2:
                    step_focus += "**Modify Bits**: Click canvas coordinates $(X, Y)$ and flip individual bits across R, G, B registers."
                elif step == 3:
                    step_focus += "**Add Hidden Message**: Embed secret plaintext into carrier LSBs with optional AES-256 passkey encryption."
                elif step == 4:
                    step_focus += "**Run Steganalysis**: Subject the modified carrier to StegoNet-Lite CNN inference."
                elif step == 5:
                    step_focus += "**Complete Analysis Results**: Review PSNR, changed pixel counts, and differential heatmaps."

                return (
                    "### 🔬 StegoShield Forensic Laboratory (5-Step Pipeline)\n\n"
                    "The Forensic Lab is an interactive sequential workstation:\n\n"
                    "- **Step 1 — Upload Image**: Ingest an uncompressed reference image and establish baseline SHA-256 hash.\n"
                    "- **Step 2 — Modify Bits**: Inspect $(X, Y)$ coordinates, read RGB bytes, and toggle/set/clear bits on 8-bit registers.\n"
                    "- **Step 3 — Add Hidden Message**: Embed arbitrary secret text into carrier LSBs with optional AES-256 encryption.\n"
                    "- **Step 4 — Run Steganalysis**: Execute StegoNet-Lite CNN inference to evaluate spatial noise residuals.\n"
                    "- **Step 5 — Complete Analysis Results**: Inspect changed pixels, PSNR, curtain wipe sliders, and differential heatmaps."
                    + step_focus
                )
            elif "studio" in page:
                return (
                    "### 🔐 Steganography Studio Overview\n\n"
                    "- **Conceal Message Mode**: Embed secret text using Spatial LSB Replacement or evasive LSB Matching (±1), with optional AES-256 passkey.\n"
                    "- **Extract Secret Mode**: Upload a stego image and enter the password to recover the hidden text.\n"
                    "- **Evaluate in Detector**: Test how easily your created stego carrier is detected by neural networks."
                )
            elif "history" in page:
                return (
                    "### 📋 Forensic Audit Ledger (History)\n\n"
                    "Maintains an immutable chain-of-custody ledger of all forensic scans, timestamps, SHA-256 hashes, and verdict classifications compliant with ISO/IEC 27037."
                )

        # ---------------------------------------------------------------------
        # 6. DEFAULT CONTEXTUAL FALLBACK
        # ---------------------------------------------------------------------
        return (
            "### 🤖 StegoShield AI Forensic Assistant\n\n"
            f"I am actively monitoring your session on the **{page.strip('/').title() or 'Dashboard'}** workspace.\n\n"
            "Here is how I can help right now:\n\n"
            "- **Explain Findings**: Ask *\"Why is this image suspicious?\"* or *\"Explain my analysis results\"*.\n"
            "- **Walkthroughs**: Ask *\"How do I modify image bits?\"* or *\"What should I do next?\"*.\n"
            "- **Technical Explanations**: Ask *\"What is an LSB?\"*, *\"What is PSNR?\"*, or *\"What is Chi-Square?\"*.\n"
            "- **Tool Guidance**: Ask *\"How does the 5-step Forensic Lab work?\"*.\n\n"
            "What would you like to explore?"
        )

    @classmethod
    async def _call_gemini(cls, api_key: str, query: str, history: List[ChatMessage], ctx: ChatContext) -> Tuple[Optional[str], Optional[str]]:
        """Optional caller for Google Gemini API if configured. Returns (reply, error_message)."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            system_instruction = (
                "You are the StegoShield AI Forensic Assistant, an expert digital image forensics and neural steganalysis advisor. "
                "Explain concepts clearly, beginner-friendly first, with deep mathematical rigor on demand. "
                f"Current Page: {ctx.current_page or 'Dashboard'}. Current Step: {ctx.workflow_step or 'N/A'}. "
                f"Active Analysis Context: {json.dumps(ctx.analysis_data or {})}. Never fabricate forensic evidence. "
                "Distinguish between evidence suggesting steganography vs clean image vs inconclusive results. "
                "Always remind that statistical indicators provide probabilistic evidence, not absolute proof without key/payload extraction."
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
            with urllib.request.urlopen(req, timeout=12) as resp:
                res_data = json.loads(resp.read().decode())
                return res_data["candidates"][0]["content"]["parts"][0]["text"], None
        except urllib.error.HTTPError as e:
            return None, f"HTTP Error {e.code}: {e.reason}"
        except Exception as e:
            return None, f"Request failed: {str(e)}"

    @classmethod
    async def _call_openai(cls, api_key: str, query: str, history: List[ChatMessage], ctx: ChatContext) -> Tuple[Optional[str], Optional[str]]:
        """Optional caller for OpenAI API if configured. Returns (reply, error_message)."""
        try:
            url = "https://api.openai.com/v1/chat/completions"
            messages = [{
                "role": "system",
                "content": (
                    "You are the StegoShield AI Forensic Assistant, an expert digital image forensics and neural steganalysis advisor. "
                    f"Current Page: {ctx.current_page or 'Dashboard'}. Active Step: {ctx.workflow_step or 'N/A'}. "
                    f"Active Analysis Data: {json.dumps(ctx.analysis_data or {})}. Never fabricate forensic evidence. "
                    "Distinguish between evidence suggesting steganography vs clean image vs inconclusive results. "
                    "Always remind that statistical indicators provide probabilistic evidence, not absolute proof without key/payload extraction."
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
            with urllib.request.urlopen(req, timeout=12) as resp:
                res_data = json.loads(resp.read().decode())
                return res_data["choices"][0]["message"]["content"], None
        except urllib.error.HTTPError as e:
            return None, f"HTTP Error {e.code}: {e.reason}"
        except Exception as e:
            return None, f"Request failed: {str(e)}"
