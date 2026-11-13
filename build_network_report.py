import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# -----------------------------------------------------------------------------
# FONT REGISTRATION: Windows TrueType fonts (Cambria & Times New Roman)
# -----------------------------------------------------------------------------
pdfmetrics.registerFont(TTFont('Cambria', 'C:/Windows/Fonts/cambria.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('Cambria-Bold', 'C:/Windows/Fonts/cambriab.ttf'))
pdfmetrics.registerFont(TTFont('Cambria-Italic', 'C:/Windows/Fonts/cambriai.ttf'))
pdfmetrics.registerFont(TTFont('Cambria-BoldItalic', 'C:/Windows/Fonts/cambriaz.ttf'))
pdfmetrics.registerFontFamily(
    'Cambria',
    normal='Cambria',
    bold='Cambria-Bold',
    italic='Cambria-Italic',
    boldItalic='Cambria-BoldItalic'
)

pdfmetrics.registerFont(TTFont('TimesNewRoman', 'C:/Windows/Fonts/times.ttf'))
pdfmetrics.registerFont(TTFont('TimesNewRoman-Bold', 'C:/Windows/Fonts/timesbd.ttf'))
pdfmetrics.registerFont(TTFont('TimesNewRoman-Italic', 'C:/Windows/Fonts/timesi.ttf'))
pdfmetrics.registerFont(TTFont('TimesNewRoman-BoldItalic', 'C:/Windows/Fonts/timesbi.ttf'))
pdfmetrics.registerFontFamily(
    'TimesNewRoman',
    normal='TimesNewRoman',
    bold='TimesNewRoman-Bold',
    italic='TimesNewRoman-Italic',
    boldItalic='TimesNewRoman-BoldItalic'
)

# Colors matching the reference PDF and academic design
DARK_BLUE = colors.HexColor("#10366E")      # Primary deep navy heading
TEAL_DIVIDER = colors.HexColor("#20809D")   # Thin teal divider bar
BODY_CHARCOAL = colors.HexColor("#222222")  # Professional dark body text
LIGHT_BG = colors.HexColor("#F8FAFC")       # Table / card background
TABLE_BORDER = colors.HexColor("#CBD5E1")   # Table border
HEADER_GRAY = colors.HexColor("#555555")    # Running header text
TABLE_HDR_BG = colors.HexColor("#EBF3FA")   # Table header background
ACCENT_GREEN = colors.HexColor("#16A34A")

PAGE_WIDTH, PAGE_HEIGHT = A4

class AcademicNumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that renders:
    1. Elegant double-line engineering page borders on all 14 pages.
    2. Professional geometric corner accents.
    3. Running headers and footers with exact page numbers.
    4. Cover page watermark and institutional header.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        w, h = PAGE_WIDTH, PAGE_HEIGHT
        pnum = self._pageNumber

        # -------------------------------------------------------------
        # 1. ELEGANT ENGINEERING PAGE BORDERS (All 14 pages)
        # -------------------------------------------------------------
        # Outer border: Dark Navy Blue (1.2 pt)
        self.setStrokeColor(DARK_BLUE)
        self.setLineWidth(1.2)
        self.rect(24, 18, w - 48, h - 36)

        # Inner border: Teal Accent (0.6 pt)
        self.setStrokeColor(TEAL_DIVIDER)
        self.setLineWidth(0.6)
        self.rect(28, 22, w - 56, h - 44)

        # Geometric Corner Patterns
        corners = [(24, 18), (w - 24, 18), (24, h - 18), (w - 24, h - 18)]
        if pnum == 1:
            for cx, cy in corners:
                self.setFillColor(DARK_BLUE)
                self.rect(cx - 3.5, cy - 3.5, 7, 7, fill=1, stroke=0)
                self.setFillColor(TEAL_DIVIDER)
                self.rect(cx - 1.5, cy - 1.5, 3, 3, fill=1, stroke=0)
            
            # Subtle corner brackets
            self.setStrokeColor(DARK_BLUE)
            self.setLineWidth(0.8)
            # Top-left bracket
            self.line(34, h - 22, 44, h - 22)
            self.line(28, h - 28, 28, h - 38)
            # Top-right bracket
            self.line(w - 34, h - 22, w - 44, h - 22)
            self.line(w - 28, h - 28, w - 28, h - 38)
            # Bottom-left bracket
            self.line(34, 22, 44, 22)
            self.line(28, 28, 28, 38)
            # Bottom-right bracket
            self.line(w - 34, 22, w - 44, 22)
            self.line(w - 28, 28, w - 28, 38)
        else:
            for cx, cy in corners:
                self.setFillColor(DARK_BLUE)
                self.rect(cx - 2.5, cy - 2.5, 5, 5, fill=1, stroke=0)
                self.setFillColor(TEAL_DIVIDER)
                self.rect(cx - 1.2, cy - 1.2, 2.4, 2.4, fill=1, stroke=0)

        # -------------------------------------------------------------
        # 2. RUNNING HEADER
        # -------------------------------------------------------------
        if pnum == 1:
            # Cover page institutional header
            self.setFont("Cambria-Bold", 10.5)
            self.setFillColor(DARK_BLUE)
            self.drawCentredString(w / 2.0, h - 38, "ZEAL COLLEGE OF ENGINEERING & RESEARCH")
            self.setFont("Cambria-Bold", 8.5)
            self.drawCentredString(w / 2.0, h - 49, "DEPARTMENT OF ELECTRONICS AND COMPUTER ENGINEERING")
            self.setStrokeColor(TEAL_DIVIDER)
            self.setLineWidth(0.8)
            self.line(48, h - 55, w - 48, h - 55)
        else:
            # Academic Running header on pages 2-14
            self.setFont("TimesNewRoman-Bold", 8.5)
            self.setFillColor(HEADER_GRAY)
            self.drawCentredString(w / 2.0, h - 36,
                                   "ZEAL COLLEGE OF ENGINEERING & RESEARCH | DEPARTMENT OF ELECTRONICS AND COMPUTER ENGINEERING")
            self.setStrokeColor(TEAL_DIVIDER)
            self.setLineWidth(0.65)
            self.line(48, h - 42, w - 48, h - 42)

        # -------------------------------------------------------------
        # 3. WATERMARK ON COVER PAGE (Page 1 only)
        # -------------------------------------------------------------
        if pnum == 1:
            watermark_path = 'report_assets/watermark_cover.png'
            if os.path.exists(watermark_path):
                wm_w = 340
                wm_h = 380
                wm_x = (w - wm_w) / 2.0
                wm_y = (h - wm_h) / 2.0 - 10
                self.drawImage(watermark_path, wm_x, wm_y, width=wm_w, height=wm_h,
                               preserveAspectRatio=True, mask='auto')

        # -------------------------------------------------------------
        # 4. RUNNING FOOTER (All pages)
        # -------------------------------------------------------------
        if pnum == 1:
            self.setStrokeColor(TEAL_DIVIDER)
            self.setLineWidth(0.8)
            self.line(48, 36, w - 48, 36)
            self.setFont("TimesNewRoman", 8.5)
            self.setFillColor(HEADER_GRAY)
            self.drawCentredString(w / 2.0, 25, "CIE-2 Activity 3 & 4 • Computer Network Data Transmission | Page 1")
        else:
            self.setStrokeColor(TEAL_DIVIDER)
            self.setLineWidth(0.65)
            self.line(48, 36, w - 48, 36)
            self.setFont("TimesNewRoman", 8.5)
            self.setFillColor(HEADER_GRAY)
            footer_text = f"CIE-2 Activity 3 & 4 • Computer Network Data Transmission | Page {pnum}"
            self.drawCentredString(w / 2.0, 25, footer_text)

        self.restoreState()


def get_styles():
    styles = getSampleStyleSheet()

    # Section Heading Style (Dark Blue, Cambria Bold, Centered)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='Cambria-Bold',
        fontSize=16,
        leading=20,
        textColor=DARK_BLUE,
        alignment=1, # Centered
        spaceAfter=3,
        spaceBefore=0
    ))

    # Section Heading Left Aligned
    styles.add(ParagraphStyle(
        name='SectionHeadingLeft',
        fontName='Cambria-Bold',
        fontSize=16,
        leading=20,
        textColor=DARK_BLUE,
        alignment=0, # Left
        spaceAfter=3,
        spaceBefore=0
    ))

    # Sub-heading Style
    styles.add(ParagraphStyle(
        name='SubHeading',
        fontName='Cambria-Bold',
        fontSize=10.5,
        leading=14,
        textColor=DARK_BLUE,
        alignment=0,
        spaceBefore=3.5,
        spaceAfter=2
    ))

    # Sub-sub-heading Style
    styles.add(ParagraphStyle(
        name='SubSubHeading',
        fontName='Cambria-Bold',
        fontSize=10,
        leading=13,
        textColor=DARK_BLUE,
        alignment=0,
        spaceBefore=3,
        spaceAfter=2
    ))

    # Industry Exposure Side-by-Side Styles (Matching user-uploaded layout)
    styles.add(ParagraphStyle(
        name='SquareFigCaption',
        fontName='Cambria-Italic',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#555555"),
        alignment=1, # Center
        spaceBefore=3,
        spaceAfter=0
    ))

    styles.add(ParagraphStyle(
        name='IndustryExposureBody',
        fontName='Cambria',
        fontSize=8.6,
        leading=11.4,
        textColor=BODY_CHARCOAL,
        alignment=4, # Justified
        spaceAfter=0
    ))

    # Body Text (Justified, Cambria, clean leading)
    styles.add(ParagraphStyle(
        name='ReportBody',
        fontName='Cambria',
        fontSize=9.2,
        leading=12.8,
        textColor=BODY_CHARCOAL,
        alignment=4, # Justified
        spaceAfter=3
    ))

    # Body Text Left-aligned
    styles.add(ParagraphStyle(
        name='ReportBodyLeft',
        fontName='Cambria',
        fontSize=8.8,
        leading=12.2,
        textColor=BODY_CHARCOAL,
        alignment=0,
        spaceAfter=2.5
    ))

    # Bullet Text
    styles.add(ParagraphStyle(
        name='ReportBullet',
        fontName='Cambria',
        fontSize=9.0,
        leading=12.5,
        textColor=BODY_CHARCOAL,
        alignment=4,
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=2.5
    ))

    # Math Equation Block (Centered, Cambria-Italic, Professional)
    styles.add(ParagraphStyle(
        name='MathEquation',
        fontName='Cambria-Italic',
        fontSize=9.5,
        leading=13,
        textColor=DARK_BLUE,
        alignment=1,
        spaceBefore=2,
        spaceAfter=2
    ))

    # Math Definition / Variable list
    styles.add(ParagraphStyle(
        name='MathVariableDef',
        fontName='Cambria',
        fontSize=8.4,
        leading=11.4,
        textColor=colors.HexColor("#334155"),
        alignment=4,
        leftIndent=10,
        spaceAfter=2.5
    ))

    # Caption Style
    styles.add(ParagraphStyle(
        name='FigureCaption',
        fontName='Cambria-Italic',
        fontSize=7.8,
        leading=9.5,
        textColor=colors.HexColor("#333333"),
        alignment=1,
        spaceBefore=1.5,
        spaceAfter=3
    ))

    # Cover Page Specific Styles
    styles.add(ParagraphStyle(
        name='CoverActivity',
        fontName='Cambria-Bold',
        fontSize=14,
        leading=18,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=10
    ))

    styles.add(ParagraphStyle(
        name='CoverReportOn',
        fontName='Cambria',
        fontSize=11.5,
        leading=15,
        textColor=BODY_CHARCOAL,
        alignment=1,
        spaceAfter=12
    ))

    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName='Cambria-Bold',
        fontSize=19,
        leading=24,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=16
    ))

    styles.add(ParagraphStyle(
        name='CoverBy',
        fontName='Cambria',
        fontSize=11,
        leading=15,
        textColor=BODY_CHARCOAL,
        alignment=1,
        spaceAfter=3
    ))

    styles.add(ParagraphStyle(
        name='CoverDeptClass',
        fontName='Cambria-Bold',
        fontSize=11.5,
        leading=15,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=12
    ))

    styles.add(ParagraphStyle(
        name='CoverStudentName',
        fontName='Cambria',
        fontSize=10,
        leading=15,
        textColor=BODY_CHARCOAL,
        alignment=0
    ))

    styles.add(ParagraphStyle(
        name='CoverGuideHeading',
        fontName='Cambria-Bold',
        fontSize=11.5,
        leading=15,
        textColor=TEAL_DIVIDER,
        alignment=1,
        spaceBefore=14,
        spaceAfter=3
    ))

    styles.add(ParagraphStyle(
        name='CoverGuideName',
        fontName='Cambria-Bold',
        fontSize=12,
        leading=16,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=16
    ))

    styles.add(ParagraphStyle(
        name='CoverFooterDept',
        fontName='Cambria-Bold',
        fontSize=11,
        leading=15,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=2
    ))

    styles.add(ParagraphStyle(
        name='CoverFooterCollege',
        fontName='Cambria-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=2
    ))

    styles.add(ParagraphStyle(
        name='CoverFooterYear',
        fontName='Cambria-Bold',
        fontSize=11,
        leading=15,
        textColor=TEAL_DIVIDER,
        alignment=1
    ))

    # TOC Styles
    styles.add(ParagraphStyle(
        name='TOCItemTitle',
        fontName='Cambria',
        fontSize=10,
        leading=16,
        textColor=BODY_CHARCOAL,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='TOCItemPage',
        fontName='Cambria-Bold',
        fontSize=10,
        leading=16,
        textColor=DARK_BLUE,
        alignment=2 # Right
    ))

    return styles

def build_pdf(filename="Engineering_Mathematics_III_Report_Computer_Network_Laplace.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=48
    )

    styles = get_styles()
    story = []

    def make_divider(width=487, height=1.5, color=TEAL_DIVIDER, spaceAfter=6):
        return HRFlowable(
            width=width,
            thickness=height,
            color=color,
            spaceBefore=2,
            spaceAfter=spaceAfter,
            hAlign='CENTER'
        )

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 26))
    story.append(Paragraph("CIE-2 Activity 3 & 4", styles['CoverActivity']))
    story.append(Spacer(1, 4))
    story.append(Paragraph("A Report On", styles['CoverReportOn']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("APPLICATION OF LAPLACE TRANSFORM<br/>IN<br/>COMPUTER NETWORK DATA TRANSMISSION", styles['CoverTitle']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("By –", styles['CoverBy']))
    story.append(Paragraph("SY ECE<br/>Div-A", styles['CoverDeptClass']))
    story.append(Spacer(1, 6))

    # Six Students Table - EXACT ORDER: Trisha Moolya FIRST!
    students_data = [
        [Paragraph("1.", styles['CoverStudentName']), Paragraph("EC2151", styles['CoverStudentName']), Paragraph("Trisha Moolya", styles['CoverStudentName'])],
        [Paragraph("2.", styles['CoverStudentName']), Paragraph("EC2149", styles['CoverStudentName']), Paragraph("Rutvij Kotwal", styles['CoverStudentName'])],
        [Paragraph("3.", styles['CoverStudentName']), Paragraph("EC2150", styles['CoverStudentName']), Paragraph("Piyush Salgude", styles['CoverStudentName'])],
        [Paragraph("4.", styles['CoverStudentName']), Paragraph("EC2152", styles['CoverStudentName']), Paragraph("Saurabh Singh", styles['CoverStudentName'])],
        [Paragraph("5.", styles['CoverStudentName']), Paragraph("EC2153", styles['CoverStudentName']), Paragraph("Radhika Sarnagire", styles['CoverStudentName'])],
        [Paragraph("6.", styles['CoverStudentName']), Paragraph("EC2154", styles['CoverStudentName']), Paragraph("Bhumika Kale", styles['CoverStudentName'])],
    ]
    t_students = Table(students_data, colWidths=[20, 65, 175], hAlign='CENTER')
    t_students.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_students)

    story.append(Spacer(1, 16))
    story.append(Paragraph("Guide –", styles['CoverGuideHeading']))
    story.append(Paragraph("Prof. Tejaswini Pawar", styles['CoverGuideName']))

    story.append(Spacer(1, 26))
    story.append(Paragraph("Department Of Electronics and Computer Engineering", styles['CoverFooterDept']))
    story.append(Paragraph("ZEAL COLLEGE OF ENGINEERING & RESEARCH, PUNE – 41", styles['CoverFooterCollege']))
    story.append(Paragraph("[2026-27]", styles['CoverFooterYear']))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TABLE OF CONTENTS
    # =========================================================================
    story.append(Paragraph("TABLE OF CONTENTS", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=18))
    story.append(Spacer(1, 10))

    toc_items = [
        ("1. Abstract", "3"),
        ("2. Introduction", "4"),
        ("3. Definition of Computer Network Data Transmission", "5"),
        ("4. Mathematical Analysis", "6"),
        ("5. Applications of Mathematics in Computer Network Data Transmission", "7"),
        ("6. Definition and Properties of Laplace Transform", "8"),
        ("7. Inverse Laplace Transform", "9"),
        ("8. Application of Differential Equations by Laplace Transform", "10"),
        ("9. Real-Life Industry Exposure", "11"),
        ("10. Application of Laplace Transform in Computer Network Data Transmission", "12"),
        ("11. Conclusion", "13"),
        ("12. Summary", "14"),
    ]

    toc_table_data = []
    for title, page_str in toc_items:
        toc_table_data.append([
            Paragraph(title, styles['TOCItemTitle']),
            Paragraph(page_str, styles['TOCItemPage'])
        ])

    t_toc = Table(toc_table_data, colWidths=[420, 60], hAlign='CENTER')
    t_toc.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 9.5),
        ('TOPPADDING', (0,0), (-1,-1), 9.5),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#EAECEE")),
    ]))
    story.append(t_toc)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: 1. ABSTRACT
    # =========================================================================
    story.append(Paragraph("1. Abstract", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "Computer network data transmission forms the physical technological infrastructure supporting global communications, cloud computing, "
        "and industrial automation. While software protocol stacks abstract data as discrete packets and binary bits, physical transmission media—such "
        "as twisted-pair copper cables, coaxial transmission lines, optical silica fibers, and wireless radio-frequency (RF) channels—can only conduct "
        "continuous electromagnetic waves. The <b>Laplace Transform</b> provides the indispensable mathematical apparatus for transforming "
        "intractable continuous-time differential equations of transmission channels into solvable algebraic expressions in the complex "
        "frequency <i>s</i>-domain. Core technical aspects explored in this report include:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "• <b>Physical Channel Modeling:</b> Representation of distributed transmission line parameters (RLCG components) and lumped filter "
        "circuits using operational transfer functions <i>H(s) = V<sub>out</sub>(s)/V<sub>in</sub>(s)</i>.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Signal Attenuation & Dispersion Analysis:</b> Mathematical evaluation of high-frequency attenuation, exponential amplitude decay, "
        "and pulse broadening that induce Inter-Symbol Interference (ISI) across band-limited physical links.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Transient Response & Rise-Time Formulation:</b> Investigation of continuous-time voltage and current transients across first-order "
        "RC and second-order RLC circuit models, quantifying bit-period timing margins and transmission bandwidth.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Continuous-Time Equalization:</b> Synthesis of analog receive-side line equalizers and low-pass filter networks in the "
        "<i>s</i>-domain to reconstruct distorted digital square pulses prior to threshold detection.",
        styles['ReportBullet']
    ))

    story.append(Spacer(1, 2))
    if os.path.exists('report_assets/diagram_net_abstract.png'):
        story.append(RLImage('report_assets/diagram_net_abstract.png', width=450, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 1.1: Functional Representation of End-to-End Data Transmission Mapped to Laplace Complex Frequency Domain.", styles['FigureCaption']))

    story.append(Paragraph(
        "By mapping continuous-time convolution into straightforward algebraic multiplication in the <i>s</i>-plane, the Laplace "
        "Transform enables communications engineers to optimize transceiver equalization, maximize channel capacity, and ensure error-free bit recovery.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: 2. INTRODUCTION
    # =========================================================================
    story.append(Paragraph("2. Introduction", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "A <b>computer network</b> is an interconnected ensemble of computing nodes exchanging digital information across physical communication "
        "channels. The core functionality rests upon <b>data transmission</b>: the propagation of encoded bitstreams from a sender to a receiver. "
        "Modern enterprise communications integrate wired channels (twisted-pair copper, coaxial lines, optical fiber) and wireless radio links.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "At the software level, data is abstracted as discrete binary digits ('0's and '1's). However, at the physical layer, transmission media "
        "conduct continuous electromagnetic voltages or optical photons. Every physical link exhibits inherent resistance (<i>R</i>), "
        "inductance (<i>L</i>), capacitance (<i>C</i>), and conductance (<i>G</i>), which attenuate higher harmonics and disperse pulse edges.",
        styles['ReportBody']
    ))

    # Side-by-side or stacked technical diagrams and authentic photograph
    if os.path.exists('report_assets/diagram_net_arch.png') and os.path.exists('report_assets/photo_network_switch.png'):
        img_arch = RLImage('report_assets/diagram_net_arch.png', width=255, height=135)
        img_switch = RLImage('report_assets/photo_network_switch.png', width=205, height=135)
        t_intro = Table([[img_arch, img_switch]], colWidths=[265, 215], hAlign='CENTER')
        t_intro.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
        ]))
        story.append(t_intro)
        story.append(Paragraph("Figure 2.1: Sender-Channel-Receiver Signal Architecture (Left) and Enterprise Rackmount Ethernet Switches & Patch Panels (Right).", styles['FigureCaption']))
    elif os.path.exists('report_assets/diagram_net_arch.png'):
        story.append(RLImage('report_assets/diagram_net_arch.png', width=450, height=140, hAlign='CENTER'))
        story.append(Paragraph("Figure 2.1: Architectural Overview of Sender, Continuous-Time Channel Medium, and Receiver Signal Processing Chain.", styles['FigureCaption']))

    story.append(Paragraph(
        "Herein lies the profound power of <b>Engineering Mathematics III</b>: the <b>Laplace Transform</b> converts linear differential "
        "equations into algebraic polynomials in the <i>s</i>-domain. By evaluating channel transfer functions <i>H(s)</i>, engineers predict "
        "pulse rise-times, calculate spectral bandwidth, and design analog equalizers that eliminate inter-symbol interference.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: 3. DEFINITION OF COMPUTER NETWORK DATA TRANSMISSION
    # =========================================================================
    story.append(Paragraph("3. Definition of Computer Network Data Transmission", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Computer network data transmission</b> is formally defined as the physical transfer and propagation of encoded digital bitstreams "
        "over point-to-point or multipoint communication channels via continuous-time electromagnetic or optical signals, subject to the "
        "governing laws of electromagnetism, circuit differential equations, and signal processing constraints.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "• <b>Bit Rate (R):</b> The transmission speed quantified as the number of bits transferred per unit time: <i>R = N / Δt</i> (bps).<br/>"
        "• <b>Channel Bandwidth (B):</b> The range of continuous frequencies passed by the channel with acceptable loss: <i>B = f₂ - f₁</i> (Hz).<br/>"
        "• <b>Signal Attenuation (Power vs. Voltage Distinction):</b> Signal attenuation quantifies the logarithmic reduction in signal strength. "
        "For signal power, attenuation in decibels is: <i>A<sub>power (dB)</sub> = 10 · log₁₀(P<sub>in</sub> / P<sub>out</sub>)</i>. "
        "For signal voltage (under matched input/output impedances <i>Z<sub>in</sub> = Z<sub>out</sub></i>), because power is proportional to voltage squared "
        "(<i>P = V² / Z</i>), attenuation is expressed with a factor of 20: <i>A<sub>voltage (dB)</sub> = 20 · log₁₀(V<sub>in</sub> / V<sub>out</sub>)</i>.<br/>"
        "• <b>Propagation Delay (t<sub>prop</sub>):</b> The finite time required for a wavefront to travel link distance <i>d</i>: <i>t<sub>prop</sub> = d / v<sub>prop</sub></i>, "
        "where <i>v<sub>prop</sub> ≈ 2 × 10⁸</i> m/s in copper and optical glass.<br/>"
        "• <b>Transmission Modes:</b> Simplex (unidirectional), Half-Duplex (two-way alternate), and Full-Duplex (simultaneous bidirectional).",
        styles['ReportBody']
    ))

    # Side-by-side: Transmission modes schematic + authentic Ethernet cable photo
    if os.path.exists('report_assets/diagram_transmission_modes.png') and os.path.exists('report_assets/photo_ethernet_rj45.png'):
        img_modes = RLImage('report_assets/diagram_transmission_modes.png', width=265, height=125)
        img_eth = RLImage('report_assets/photo_ethernet_rj45.png', width=165, height=125)
        t_p5 = Table([[img_modes, img_eth]], colWidths=[280, 195], hAlign='CENTER')
        t_p5.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
        ]))
        story.append(t_p5)
        story.append(Paragraph("Figure 3.1: Data Transmission Modes (Left) and Authentic Category 6 UTP Ethernet Cable with RJ45 Connector (Right).", styles['FigureCaption']))
    elif os.path.exists('report_assets/diagram_transmission_modes.png'):
        story.append(RLImage('report_assets/diagram_transmission_modes.png', width=450, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 3.1: Fundamental Transmission Modes (Simplex, Half-Duplex, Full-Duplex) and Physical Media Types.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Analytical Distinction:</b> The Laplace Transform applies specifically to continuous-time circuit dynamics, cable impulse response, "
        "and transceiver filtering at the physical layer, rather than discrete packet routing protocols.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: 4. MATHEMATICAL ANALYSIS
    # =========================================================================
    story.append(Paragraph("4. Mathematical Analysis", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Rigorous Derivation of Transmission Line Circuit Model:</b><br/>"
        "Consider a lumped transmission line segment of series resistance <i>R</i>, series inductance <i>L</i>, and shunt capacitance <i>C</i>. "
        "Applying Kirchhoff's Voltage Law (KVL) around the loop:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>v<sub>in</sub>(t) = v<sub>R</sub>(t) + v<sub>L</sub>(t) + v<sub>out</sub>(t) = R i(t) + L · (di/dt) + v<sub>out</sub>(t)</i><br/>"
        "Because the total loop current charges the shunt capacitor, <i>i(t) = C · (dv<sub>out</sub>/dt)</i> and <i>di/dt = C · (d²v<sub>out</sub>/dt²)</i>. "
        "Substituting into the KVL equation yields the governing second-order ordinary differential equation:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<i>L C · (d²v<sub>out</sub>(t) / dt²) + R C · (dv<sub>out</sub>(t) / dt) + v<sub>out</sub>(t) = v<sub>in</sub>(t) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 4.1)</i>",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "In standard canonical control form: <i>d²v<sub>out</sub>/dt² + (R/L) · (dv<sub>out</sub>/dt) + (1/LC) · v<sub>out</sub> = (1/LC) · v<sub>in</sub>(t)</i>, "
        "where the undamped natural frequency is <i>ω_n = 1 / √(LC)</i> and damping ratio is <i>ζ = (R/2) · √(C/L)</i>.",
        styles['MathVariableDef']
    ))

    if os.path.exists('report_assets/diagram_signal_waveform.png'):
        story.append(RLImage('report_assets/diagram_signal_waveform.png', width=450, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 4.1: Pulse Edge Dispersion, Rise-Time Elongation, and Channel Low-Pass Frequency Response.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Theoretical Channel Capacity Bounds (Nyquist and Shannon Limits):</b>",
        styles['SubHeading']
    ))
    story.append(Paragraph(
        "It is essential to understand that both the Nyquist and Shannon formulas define <b>theoretical upper bounds</b>, not guaranteed operating speeds:<br/>"
        "• <b>Nyquist Maximum Bit Rate (Ideal Noiseless Channel Bound):</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>R<sub>max</sub> = 2 · B · log₂(M) &nbsp; [bps] &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 4.2)</i><br/>"
        "This formula represents the absolute theoretical limit for a channel of bandwidth <i>B</i> using <i>M</i> discrete signaling levels without noise. "
        "Practical systems require excess bandwidth factor <i>α > 0</i> (raised cosine filtering), yielding achievable rates <i>R = 2B / (1 + α) · log₂(M)</i>.<br/>"
        "• <b>Shannon-Hartley Channel Capacity (Maximum Information Bound under Noise):</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>C = B · log₂(1 + SNR) = B · log₂(1 + P<sub>signal</sub> / P<sub>noise</sub>) &nbsp; [bps] &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 4.3)</i><br/>"
        "Shannon's theorem proves the fundamental mathematical ceiling on error-free information transmission over an additive white Gaussian noise (AWGN) channel. "
        "Real-world transceivers operate 1–3 dB below this theoretical limit due to finite coding block-lengths and implementation losses.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: 5. APPLICATIONS OF MATHEMATICS IN COMPUTER NETWORK TRANSMISSION
    # =========================================================================
    story.append(Paragraph("5. Applications of Mathematics in Computer Network Data Transmission", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "Mathematical modeling provides the quantitative foundation for designing network hardware, calculating bandwidth limitations, "
        "and mitigating transmission impairments across physical media.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<b>1. Channel Bandwidth & Theoretical Nyquist Rate Calculation:</b><br/>"
        "Consider a Category 6 UTP cable installation operating with an effective bandwidth of <i>B = 250</i> MHz using 4-level pulse amplitude "
        "modulation (PAM-4, <i>M = 4</i>). The theoretical maximum noiseless data rate is:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>R<sub>max</sub> = 2 · (250 × 10⁶) · log₂(4) = 2 · (250 × 10⁶) · 2 = 1000 Mbps = 1.0 Gbps</i>.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<b>2. Shannon Capacity under Additive Gaussian Noise:</b><br/>"
        "If the same 250 MHz cable operates in an industrial environment with <i>SNR<sub>dB</sub> = 30</i> dB, "
        "the linear power ratio is <i>SNR = 10^(30/10) = 1000</i>. The Shannon capacity is:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>C = (250 × 10⁶) · log₂(1001) ≈ (250 × 10⁶) · 9.967 = 2.492 Gbps</i>.<br/>"
        "This proves that thermal noise sets an unyielding theoretical ceiling regardless of transceiver complexity.",
        styles['ReportBody']
    ))

    # Side-by-side: Attenuation curve + authentic optical LC connector photo
    if os.path.exists('report_assets/diagram_attenuation_bandwidth.png') and os.path.exists('report_assets/photo_optical_lc.png'):
        img_atten = RLImage('report_assets/diagram_attenuation_bandwidth.png', width=285, height=125)
        img_lc = RLImage('report_assets/photo_optical_lc.png', width=165, height=125)
        t_p7 = Table([[img_atten, img_lc]], colWidths=[295, 180], hAlign='CENTER')
        t_p7.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
        ]))
        story.append(t_p7)
        story.append(Paragraph("Figure 5.1: Attenuation vs. Distance & Shannon Frontier (Left) and Precision Duplex LC Optical Fiber Connectors (Right).", styles['FigureCaption']))
    elif os.path.exists('report_assets/diagram_attenuation_bandwidth.png'):
        story.append(RLImage('report_assets/diagram_attenuation_bandwidth.png', width=450, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 5.1: Signal Power Decay across Distance and Shannon Spectral Efficiency Tradeoff.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>3. Signal Attenuation & Propagation Delay:</b><br/>"
        "Electromagnetic power decays exponentially: <i>P(x) = P₀ · e^(-α x)</i>. For a 100-meter Cat6 link where propagation velocity is "
        "<i>v = 2.0 × 10⁸</i> m/s (approx. <i>0.67 c</i>), the one-way delay is <i>t<sub>prop</sub> = d / v = 100 / (2.0 × 10⁸) = 500 ns</i>.<br/>"
        "In the Laplace domain, this pure transport delay is modeled by the <b>Second Shifting Theorem</b>: <i>L{v(t - t<sub>prop</sub>)u(t - t<sub>prop</sub>)} = e^(-s · t<sub>prop</sub>) · V(s)</i>.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: 6. DEFINITION AND PROPERTIES OF LAPLACE TRANSFORM
    # =========================================================================
    story.append(Paragraph("6. Definition and Properties of Laplace Transform", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Mathematical Definition:</b> Let <i>f(t)</i> be a continuous or piecewise continuous time-domain function defined for <i>t ≥ 0</i>. "
        "The unilateral Laplace Transform of <i>f(t)</i>, denoted as <b>L{f(t)}</b> or <i>F(s)</i>, is defined by the improper integral:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<i>L{f(t)} = F(s) = ∫₀^∞ e^(-st) · f(t) dt &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 6.1)</i>",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "where <i>s = σ + jω</i> is the complex frequency variable in rad/s, <i>σ</i> is the attenuation constant, <i>ω</i> is radial frequency, "
        "and <i>j = √(-1)</i>. The integral converges in the Region of Convergence (ROC) where <i>Re(s) > σ₀</i>.",
        styles['MathVariableDef']
    ))

    # Standard Elementary Transforms Table
    table_data = [
        [Paragraph("<b>Sr. No.</b>", styles['ReportBodyLeft']), Paragraph("<b>Time Function f(t)</b>", styles['ReportBodyLeft']), Paragraph("<b>Laplace Transform F(s) = L{f(t)}</b>", styles['ReportBodyLeft']), Paragraph("<b>Region of Convergence</b>", styles['ReportBodyLeft'])],
        [Paragraph("1", styles['ReportBodyLeft']), Paragraph("1 (Unit Step u(t))", styles['ReportBodyLeft']), Paragraph("1 / s", styles['ReportBodyLeft']), Paragraph("Re(s) > 0", styles['ReportBodyLeft'])],
        [Paragraph("2", styles['ReportBodyLeft']), Paragraph("tⁿ (n = 1, 2, ...)", styles['ReportBodyLeft']), Paragraph("n! / sⁿ⁺¹", styles['ReportBodyLeft']), Paragraph("Re(s) > 0", styles['ReportBodyLeft'])],
        [Paragraph("3", styles['ReportBodyLeft']), Paragraph("e^(at)", styles['ReportBodyLeft']), Paragraph("1 / (s - a)", styles['ReportBodyLeft']), Paragraph("Re(s) > a", styles['ReportBodyLeft'])],
        [Paragraph("4", styles['ReportBodyLeft']), Paragraph("sin(ωt)", styles['ReportBodyLeft']), Paragraph("ω / (s² + ω²)", styles['ReportBodyLeft']), Paragraph("Re(s) > 0", styles['ReportBodyLeft'])],
        [Paragraph("5", styles['ReportBodyLeft']), Paragraph("cos(ωt)", styles['ReportBodyLeft']), Paragraph("s / (s² + ω²)", styles['ReportBodyLeft']), Paragraph("Re(s) > 0", styles['ReportBodyLeft'])],
        [Paragraph("6", styles['ReportBodyLeft']), Paragraph("sinh(at)", styles['ReportBodyLeft']), Paragraph("a / (s² - a²)", styles['ReportBodyLeft']), Paragraph("Re(s) > |a|", styles['ReportBodyLeft'])],
        [Paragraph("7", styles['ReportBodyLeft']), Paragraph("cosh(at)", styles['ReportBodyLeft']), Paragraph("s / (s² - a²)", styles['ReportBodyLeft']), Paragraph("Re(s) > |a|", styles['ReportBodyLeft'])],
        [Paragraph("8", styles['ReportBodyLeft']), Paragraph("e^(at) · tⁿ", styles['ReportBodyLeft']), Paragraph("n! / (s - a)ⁿ⁺¹", styles['ReportBodyLeft']), Paragraph("Re(s) > a", styles['ReportBodyLeft'])],
    ]
    t_laplace = Table(table_data, colWidths=[45, 130, 180, 120], hAlign='CENTER')
    t_laplace.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TABLE_HDR_BG),
        ('TEXTCOLOR', (0,0), (-1,0), DARK_BLUE),
        ('GRID', (0,0), (-1,-1), 0.5, TABLE_BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_laplace)
    story.append(Spacer(1, 2))

    if os.path.exists('report_assets/diagram_laplace_network.png'):
        story.append(RLImage('report_assets/diagram_laplace_network.png', width=450, height=125, hAlign='CENTER'))
        story.append(Paragraph("Figure 6.1: Conceptual Mapping between Continuous-Time Line Dynamics and Complex Frequency s-Domain.", styles['FigureCaption']))

    story.append(Paragraph("<b>Fundamental Operational Properties:</b>", styles['SubHeading']))
    story.append(Paragraph(
        "1. <b>Linearity:</b> <i>L{a f(t) + b g(t)} = a F(s) + b G(s)</i> for arbitrary scalars <i>a, b</i>.<br/>"
        "2. <b>First Shifting Theorem:</b> <i>L{e^(at) f(t)} = F(s - a)</i> (models exponential signal attenuation envelopes).<br/>"
        "3. <b>Second Shifting Theorem:</b> <i>L{f(t - a) · u(t - a)} = e^(-as) · F(s)</i> (models cable latency and transport delay <i>a = t<sub>prop</sub></i>).<br/>"
        "4. <b>First Derivative:</b> <i>L{df/dt} = s F(s) - f(0)</i> &nbsp;|&nbsp; <b>Second Derivative:</b> <i>L{d²f/dt²} = s² F(s) - s f(0) - f'(0)</i>.<br/>"
        "5. <b>Integration Property:</b> <i>L{∫₀ᵗ f(τ) dτ} = (1/s) F(s)</i> (models accumulation of charge across channel capacitance).",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: 7. INVERSE LAPLACE TRANSFORM
    # =========================================================================
    story.append(Paragraph("7. Inverse Laplace Transform", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Definition:</b> The Inverse Laplace Transform reconstructs the continuous time-domain signal <i>f(t)</i> from its algebraic "
        "complex frequency representation <i>F(s)</i>: <i>f(t) = L⁻¹{F(s)}</i>. Rational transfer functions <i>F(s) = P(s)/Q(s)</i> "
        "are evaluated via <b>Partial Fraction Decomposition</b>:",
        styles['ReportBody']
    ))

    # Solved Example 1
    ex1_text = (
        "<b>Solved Example 1: Partial Fraction Evaluation of Network Line Voltage Step Response</b><br/>"
        "A band-limited transmission channel has an output voltage transform: <i>V(s) = 10 / [ s (s + 5) ]</i>. Determine <i>v(t)</i>.<br/>"
        "<b>Step 1: Partial Fraction Expansion:</b> <i>10 / [ s (s + 5) ] = A / s + B / (s + 5)</i><br/>"
        "• Residue <i>A = [ 10 / (s + 5) ]_(s = 0) = 10 / 5 = 2</i><br/>"
        "• Residue <i>B = [ 10 / s ]_(s = -5) = 10 / (-5) = -2</i><br/>"
        "<b>Step 2: Inverse Transform:</b> <i>v(t) = L⁻¹{ 2 / s - 2 / (s + 5) } = [ 2 - 2 e^(-5t) ] · u(t) = 2 (1 - e^(-5t)) · u(t)</i> V.<br/>"
        "<b>Physical Conclusion:</b> At <i>t = 0</i>, <i>v(0) = 0</i> V. As <i>t → ∞</i>, <i>v(∞) = 2.0</i> V. The line charges to 90% in <i>0.46</i> s."
    )
    t_ex1 = Table([[Paragraph(ex1_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ex1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, TEAL_DIVIDER),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ex1)
    story.append(Spacer(1, 3))

    # Solved Example 2 (CORRECTED & FULLY CONSISTENT: V(s) = 29 / [s(s^2 + 4s + 29)])
    ex2_text = (
        "<b>Solved Example 2: Second-Order Resonant Ringing with Quadratic Denominator</b><br/>"
        "An underdamped RLC cable termination has an output transform: <i>V(s) = 29 / [ s (s² + 4s + 29) ]</i>. Determine <i>v(t)</i>.<br/>"
        "<b>Step 1: Completing the Square in Quadratic Term:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>s² + 4s + 29 = (s + 2)² + 25 = (s + 2)² + 5²</i> &nbsp; (damping <i>α = 2</i>, damped frequency <i>ω_d = 5</i> rad/s).<br/>"
        "<b>Step 2: Partial Fraction Expansion:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>29 / [ s ((s + 2)² + 25) ] = A / s + (B s + D) / [ (s + 2)² + 25 ]</i><br/>"
        "Multiplying by <i>s(s² + 4s + 29)</i>: <i>29 = A(s² + 4s + 29) + (Bs + D)s = (A + B)s² + (4A + D)s + 29A</i>.<br/>"
        "• Constant term: <i>29 A = 29 ⇒ A = 1</i>.<br/>"
        "• Coefficient of <i>s²</i>: <i>A + B = 0 ⇒ B = -A = -1</i>.<br/>"
        "• Coefficient of <i>s</i>: <i>4A + D = 0 ⇒ 4(1) + D = 0 ⇒ D = -4</i>.<br/>"
        "Rewriting the quadratic numerator in standard shifting form:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>- (s + 4) / [ (s + 2)² + 5² ] = - (s + 2) / [ (s + 2)² + 5² ] - (2/5) · 5 / [ (s + 2)² + 5² ]</i><br/>"
        "<b>Step 3: Exact Inverse Laplace Transform via First Shifting Property:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>v(t) = L⁻¹{ 1/s - (s + 2)/((s + 2)² + 5²) - (2/5) · 5/((s + 2)² + 5²) }</i><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>v(t) = [ 1 − e^(-2t) cos(5t) − (2/5) e^(-2t) sin(5t) ] · u(t)</i> V &nbsp;&nbsp;&nbsp;&nbsp; (for <i>t ≥ 0</i>).<br/>"
        "<b>Physical Conclusion:</b> At <i>t = 0</i>, <i>v(0) = 1 - 1 = 0</i> V. Damped ringing at 5 rad/s settles exponentially within <i>4/α = 2</i> s to <i>v(∞) = 1.0</i> V."
    )
    t_ex2 = Table([[Paragraph(ex2_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ex2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#16A34A")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ex2)
    story.append(Spacer(1, 2))

    if os.path.exists('report_assets/diagram_inverse_laplace.png'):
        story.append(RLImage('report_assets/diagram_inverse_laplace.png', width=450, height=100, hAlign='CENTER'))
        story.append(Paragraph("Figure 7.1: Systematic Residue Evaluation and Partial Fraction Decomposition Workflow.", styles['FigureCaption']))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: 8. APPLICATION OF DIFFERENTIAL EQUATIONS BY LAPLACE TRANSFORM
    # =========================================================================
    story.append(Paragraph("8. Application of Differential Equations by Laplace Transform", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Analytical Framework:</b> The Laplace Transform solves differential equations with initial values <i>y(0)</i> and <i>y'(0)</i> "
        "directly incorporated during transformation, converting the differential equation into an algebraic equation in <i>Y(s)</i>.",
        styles['ReportBody']
    ))

    # Solved Example 1: First-Order Circuit ODE
    ode1_text = (
        "<b>Solved Example 1: First-Order Transmission Line Charging Equation with Initial Voltage</b><br/>"
        "Solve the receiver line charging differential equation: <i>dv/dt + 4 v(t) = 12 u(t)</i>, with initial condition <i>v(0) = 1.0</i> V.<br/>"
        "<b>Step 1: Take Laplace Transform:</b> <i>[ s V(s) - v(0) ] + 4 V(s) = 12 / s</i><br/>"
        "<b>Step 2: Substitute Initial Condition v(0) = 1.0:</b> <i>(s + 4) V(s) - 1 = 12 / s ⇒ (s + 4) V(s) = (s + 12) / s</i><br/>"
        "<b>Step 3: Solve for V(s) Algebraically:</b> <i>V(s) = (s + 12) / [ s (s + 4) ] = A / s + B / (s + 4)</i><br/>"
        "• Residue <i>A = [ (s + 12) / (s + 4) ]_(s = 0) = 12 / 4 = 3</i><br/>"
        "• Residue <i>B = [ (s + 12) / s ]_(s = -4) = 8 / (-4) = -2</i><br/>"
        "<b>Step 4: Take Inverse Laplace Transform:</b> <i>v(t) = L⁻¹{ 3 / s - 2 / (s + 4) } = (3 - 2 e^(-4t)) · u(t)</i> V.<br/>"
        "<b>Verification:</b> At <i>t = 0</i>, <i>v(0) = 3 - 2 = 1.0</i> V. Derivative <i>v'(0) = 8 ⇒ 8 + 4(1) = 12</i>. Exact!"
    )
    t_ode1 = Table([[Paragraph(ode1_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ode1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, TEAL_DIVIDER),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ode1)
    story.append(Spacer(1, 3))

    # Solved Example 2: Second-Order RLC ODE
    ode2_text = (
        "<b>Solved Example 2: Second-Order RLC Communication Cable Resonant Equation</b><br/>"
        "Solve the second-order line current equation: <i>d²i/dt² + 6 (di/dt) + 8 i(t) = 0</i>, with initial values <i>i(0) = 2.0</i> A, <i>i'(0) = 0</i>.<br/>"
        "<b>Step 1: Apply Laplace Transform:</b> <i>[ s² I(s) - s i(0) - i'(0) ] + 6 [ s I(s) - i(0) ] + 8 I(s) = 0</i><br/>"
        "<b>Step 2: Insert Initial Conditions i(0) = 2.0, i'(0) = 0:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>s² I(s) - 2s - 0 + 6 s I(s) - 12 + 8 I(s) = 0 ⇒ (s² + 6s + 8) I(s) = 2s + 12</i><br/>"
        "<b>Step 3: Solve for I(s) and Factor Denominator:</b> <i>I(s) = (2s + 12) / [ (s + 2)(s + 4) ] = A / (s + 2) + B / (s + 4)</i><br/>"
        "• Residue <i>A = [ (2s + 12) / (s + 4) ]_(s = -2) = (-4 + 12) / (-2 + 4) = 8 / 2 = 4</i><br/>"
        "• Residue <i>B = [ (2s + 12) / (s + 2) ]_(s = -4) = (-8 + 12) / (-4 + 2) = 4 / (-2) = -2</i><br/>"
        "<b>Step 4: Inverse Transform to Obtain Time Response:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>i(t) = L⁻¹{ 4 / (s + 2) - 2 / (s + 4) } = (4 e^(-2t) - 2 e^(-4t)) · u(t)</i> A.<br/>"
        "<b>Verification:</b> At <i>t = 0</i>, <i>i(0) = 4 - 2 = 2.0</i> A. Derivative <i>i'(t) = -8 e^(-2t) + 8 e^(-4t) ⇒ i'(0) = 0</i>. Verified!"
    )
    t_ode2 = Table([[Paragraph(ode2_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ode2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#16A34A")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ode2)
    story.append(Spacer(1, 2))

    if os.path.exists('report_assets/diagram_diff_eq_flowchart.png'):
        story.append(RLImage('report_assets/diagram_diff_eq_flowchart.png', width=450, height=100, hAlign='CENTER'))
        story.append(Paragraph("Figure 8.1: Complete Methodological Flowchart for Solving Differential Equations Using Laplace Transform.", styles['FigureCaption']))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: 9. REAL-LIFE INDUSTRY EXPOSURE
    # =========================================================================
    story.append(Paragraph("9. Real-Life Industry Exposure", styles['SectionHeadingLeft']))
    story.append(make_divider(spaceAfter=4))

    story.append(Paragraph(
        "Laplace transform techniques and differential equation modeling form the core operational basis of modern telecommunication systems, "
        "data center infrastructures, high-speed optical backbones, and wireless cellular standards. Below are three mission-critical industrial "
        "applications where continuous-time <i>s</i>-domain modeling ensures physical-layer signal integrity:",
        styles['ReportBody']
    ))
    story.append(Spacer(1, 2))

    # --- 9.1 Enterprise Ethernet ---
    story.append(Paragraph("<b>9.1 Enterprise Ethernet & Cloud Data Center Switching Fabrics (10G/40G/100GBASE-T)</b>", styles['SubSubHeading']))
    p1_img_elements = []
    if os.path.exists('report_assets/photo_server_rack_sq.png'):
        p1_img_elements.append(RLImage('report_assets/photo_server_rack_sq.png', width=140, height=110, hAlign='CENTER'))
        p1_img_elements.append(Paragraph("Figure 9.1: Enterprise Server Racks and Ethernet Patch Switching Infrastructure.", styles['SquareFigCaption']))

    p1_text = (
        "Modern hyperscale cloud data centers deploy dense racks of high-speed top-of-rack switches interconnected via Category 6A/8 copper cabling. "
        "At signaling frequencies exceeding 500 MHz, distributed skin-effect resistance and dielectric losses severely attenuate higher harmonics, "
        "distorting multi-level PAM pulses.<br/><br/>"
        "<b>Role of Laplace Transform:</b> Hardware transceiver designers model channel frequency roll-off in the Laplace <i>s</i>-domain to "
        "synthesize Continuous-Time Linear Equalizers (CTLE). By placing equalizer transfer-function zeros to cancel cable poles, the receive circuitry "
        "restores pulse rise-times and eliminates inter-symbol interference prior to digital slicing."
    )
    t_ind1 = Table([[p1_img_elements, Paragraph(p1_text, styles['IndustryExposureBody'])]], colWidths=[150, 330], hAlign='CENTER')
    t_ind1.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (0,0), (0,0), 6),
        ('LEFTPADDING', (1,0), (1,0), 6),
        ('RIGHTPADDING', (1,0), (1,0), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ind1)
    story.append(Spacer(1, 3))

    # --- 9.2 Fiber-Optic Communication ---
    story.append(Paragraph("<b>9.2 Long-Haul DWDM Optical Fiber Backbones & Subsea Links</b>", styles['SubSubHeading']))
    p2_img_elements = []
    if os.path.exists('report_assets/photo_fiber_cable_sq.png'):
        p2_img_elements.append(RLImage('report_assets/photo_fiber_cable_sq.png', width=140, height=110, hAlign='CENTER'))
        p2_img_elements.append(Paragraph("Figure 9.2: Silica Optical Fiber Transporting High-Speed Photonic Bitstreams.", styles['SquareFigCaption']))

    p2_text = (
        "Intercontinental subsea cables span thousands of kilometers carrying dense wavelength-division multiplexed (DWDM) optical bitstreams. "
        "At the optical receiver, high-speed PIN or APD photodiodes convert microscopic light pulses into photocurrents that require instantaneous "
        "amplification by Transimpedance Amplifiers (TIA).<br/><br/>"
        "<b>Role of Laplace Transform:</b> Second-order Laplace transfer functions <i>H(s)</i> govern the closed-loop TIA frequency response. "
        "Communications engineers optimize pole-zero locations in the <i>s</i>-plane to establish a damping ratio <i>ζ ≈ 0.707 to 1.0</i>, "
        "achieving maximum transimpedance gain and bandwidth while preventing resonant ringing and bit decision errors."
    )
    t_ind2 = Table([[p2_img_elements, Paragraph(p2_text, styles['IndustryExposureBody'])]], colWidths=[150, 330], hAlign='CENTER')
    t_ind2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (0,0), (0,0), 6),
        ('LEFTPADDING', (1,0), (1,0), 6),
        ('RIGHTPADDING', (1,0), (1,0), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ind2)
    story.append(Spacer(1, 3))

    # --- 9.3 5G / 6G Wireless Cellular ---
    story.append(Paragraph("<b>9.3 5G / 6G Wireless Cellular Infrastructure & Base Stations</b>", styles['SubSubHeading']))
    p3_img_elements = []
    if os.path.exists('report_assets/photo_wireless_tower_sq.png'):
        p3_img_elements.append(RLImage('report_assets/photo_wireless_tower_sq.png', width=140, height=110, hAlign='CENTER'))
        p3_img_elements.append(Paragraph("Figure 9.3: 5G Massive MIMO Antenna Tower Supporting Gigabit Wireless Channels.", styles['SquareFigCaption']))

    p3_text = (
        "In 5G Massive MIMO cellular towers, base station RF transceiver arrays transmit multi-gigabit data streams across time-varying multi-path channels. "
        "Carrier synchronization and phase modulation require agile local oscillators that continuously track dynamic Doppler frequency shifts and mobile phase drift.<br/><br/>"
        "<b>Role of Laplace Transform:</b> Phase-Locked Loops (PLLs) are synthesized entirely in the complex frequency <i>s</i>-domain. "
        "The loop filter transfer function <i>F(s)</i> is formulated to set the closed-loop natural frequency <i>ω<sub>n</sub></i> and damping ratio <i>ζ = 1.0</i> "
        "(critically damped), suppressing phase jitter and guaranteeing rapid carrier locking."
    )
    t_ind3 = Table([[p3_img_elements, Paragraph(p3_text, styles['IndustryExposureBody'])]], colWidths=[150, 330], hAlign='CENTER')
    t_ind3.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (0,0), (0,0), 6),
        ('LEFTPADDING', (1,0), (1,0), 6),
        ('RIGHTPADDING', (1,0), (1,0), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ind3)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: 10. APPLICATION OF LAPLACE TRANSFORM IN NETWORK TRANSMISSION
    # =========================================================================
    story.append(Paragraph("10. Application of Laplace Transform in Computer Network Data Transmission", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=5))

    story.append(Paragraph(
        "<b>Mathematical Derivation of RC Low-Pass Physical Channel Transfer Function:</b><br/>"
        "A physical transmission cable exhibits series resistance <i>R</i> and shunt capacitance <i>C</i>. Under zero initial conditions "
        "(<i>v<sub>out</sub>(0) = 0</i>), the governing KVL equation is <i>RC · (dv<sub>out</sub>/dt) + v<sub>out</sub>(t) = v<sub>in</sub>(t)</i>. "
        "Taking the unilateral Laplace transform yields the transfer function:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>(s R C + 1) V<sub>out</sub>(s) = V<sub>in</sub>(s) ⇒ H(s) = V<sub>out</sub>(s) / V<sub>in</sub>(s) = 1 / (1 + s R C) = (1/τ) / (s + 1/τ) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 10.1)</i>",
        styles['ReportBody']
    ))

    # Side-by-side: RC Circuit Schematic + Real Laboratory Oscilloscope Screen
    if os.path.exists('report_assets/diagram_rc_lowpass.png') and os.path.exists('report_assets/photo_oscilloscope.png'):
        img_rc = RLImage('report_assets/diagram_rc_lowpass.png', width=230, height=100)
        img_osc = RLImage('report_assets/photo_oscilloscope.png', width=210, height=100)
        t_p12 = Table([[img_rc, img_osc]], colWidths=[245, 230], hAlign='CENTER')
        t_p12.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
        ]))
        story.append(t_p12)
        story.append(Paragraph("Figure 10.1: RC Low-Pass Channel Model (Left) and Digital Storage Oscilloscope Measuring Actual Pulse Waveforms (Right).", styles['FigureCaption']))
    elif os.path.exists('report_assets/diagram_rc_lowpass.png'):
        story.append(RLImage('report_assets/diagram_rc_lowpass.png', width=380, height=110, hAlign='CENTER'))
        story.append(Paragraph("Figure 10.1: Lumped RC Physical Transmission Line Low-Pass Filter Model in Laplace Domain.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Transient Step Response & Rise-Time Formulation:</b><br/>"
        "For an incoming digital bit modeled as a unit step <i>V<sub>in</sub>(s) = V₀ / s</i>:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<i>V<sub>out</sub>(s) = V₀ / [ s (1 + s R C) ] = V₀ [ 1/s - 1 / (s + 1/RC) ] ⇒ v<sub>out</sub>(t) = V₀ (1 - e^(-t/RC)) · u(t)</i>.<br/>"
        "The 10%-to-90% rise-time is: <i>t_r = RC · ln(0.9 / 0.1) ≈ 2.2 R C = 2.2 τ = 0.35 / f_c</i>, directly limiting transmission bit rate.",
        styles['ReportBody']
    ))

    if os.path.exists('report_assets/diagram_rlc_step_response.png'):
        story.append(RLImage('report_assets/diagram_rlc_step_response.png', width=380, height=105, hAlign='CENTER'))
        story.append(Paragraph("Figure 10.2: RLC Channel Transient Step Response under Underdamped, Critically Damped, and Overdamped Conditions.", styles['FigureCaption']))

    story.append(Paragraph(
        "• <b>Underdamped (ζ < 1):</b> Inadequate damping causes high-frequency ringing and false logic threshold triggering.<br/>"
        "• <b>Critically Damped (ζ = 1):</b> Optimal line termination—fastest pulse rise-time with zero overshoot and zero ringing.<br/>"
        "• <b>Overdamped (ζ > 1):</b> Excessive capacitive loading causes sluggish edges and severe inter-symbol interference (ISI).",
        styles['ReportBullet']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 13: 11. CONCLUSION
    # =========================================================================
    story.append(Paragraph("11. Conclusion", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=14))

    story.append(Paragraph(
        "The mathematical investigation presented in this technical report establishes the foundational and indispensable role of the "
        "<b>Laplace Transform</b> in analyzing, modeling, and optimizing modern <b>Computer Network Data Transmission</b>. Although computer "
        "networking is often perceived through the lens of abstract software architectures, protocol stacks, and discrete packets, all digital data "
        "must ultimately propagate as continuous electromagnetic waveforms through physical media. Operational mathematics provides the bridge "
        "between physical circuit phenomena and dependable digital communications.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "By transforming time-domain ordinary differential equations into the complex frequency <i>s</i>-domain, the Laplace Transform eliminates "
        "the formidable mathematical complexity of convolution integrals and higher-order calculus. It provides an intuitive, modular transfer-function "
        "framework where transmission cables, transceiver amplifiers, terminating impedances, and noise filters are modeled as interconnected algebraic "
        "blocks. This operational calculus enables engineers to compute exact transient step responses, analyze pole-zero s-plane stability, and "
        "predict high-frequency signal attenuation with mathematical precision.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Furthermore, the application of operational theorems—specifically the <b>First Shifting Theorem</b> (modeling exponential attenuation and "
        "damped resonance) and the <b>Second Shifting Theorem</b> (modeling cable transport delay <i>e^(-as)</i>)—provides exact analytical expressions "
        "for pulse distortion. By evaluating the damping ratio <i>ζ</i> in second-order RLC channel models, hardware engineers can design line "
        "terminations that achieve the critically damped state (<i>ζ = 1.0</i>), ensuring the fastest possible pulse rise-time while completely "
        "eradicating signal overshoot and false logic triggering.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Across the telecommunications sectors examined—including enterprise 10G/40G Ethernet networks, transoceanic fiber-optic links, and 5G/6G "
        "massive MIMO cellular systems—theoretical Laplace models directly govern the design of continuous-time linear equalizers (CTLE) and "
        "phase-locked loops (PLL) integrated into modern PHY-layer transceiver silicon. These circuits operate continuously to counteract physical "
        "channel degradation and guarantee error-free bit recovery.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Ultimately, the Laplace Transform is not merely an abstract topic in Engineering Mathematics III, but an indispensable engineering methodology "
        "that empowers electronics and computer engineers to master physical-layer signal integrity and expand the capacity frontiers of next-generation "
        "global computer networks.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 14: 12. SUMMARY
    # =========================================================================
    story.append(Paragraph("12. Summary", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=14))

    story.append(Paragraph(
        "This Engineering Mathematics III technical report delivers a rigorous mathematical and physical analysis of computer network data "
        "transmission centered on the operational principles of the <b>Laplace Transform</b>. Beginning with physical-layer fundamentals, the report "
        "examined how discrete digital bitstreams are encoded into continuous-time electromagnetic signals and transmitted over copper, optical fiber, "
        "and wireless channels. Fundamental parameters—including bit rate, channel bandwidth, signal attenuation, propagation delay, and noise—were "
        "quantitatively defined and linked to governing differential equations.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "The mathematical foundation adhered strictly to the prescribed Second Year syllabus: (1) Definition and properties of the unilateral "
        "Laplace transform <i>F(s) = ∫₀^∞ e^(-st) f(t) dt</i>, covering linearity, frequency shifting, time shifting, differentiation, and integration; "
        "(2) Inverse Laplace Transform techniques utilizing partial fraction decomposition across linear and quadratic irreducible factors; and "
        "(3) The direct solution of first-order and second-order linear differential equations with non-zero initial conditions.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Step-by-step solved mathematical examples demonstrated the exact analytical determination of line voltage transients, partial fraction residues, "
        "and second-order damped sinusoidal oscillations. In parallel, classical communications theorems—including the Nyquist Maximum Bit Rate formula "
        "<i>R = 2B log₂(M)</i> and the Shannon-Hartley Channel Capacity theorem <i>C = B log₂(1 + SNR)</i>—were evaluated to demonstrate how physical "
        "channel bandwidth and thermal noise impose definitive mathematical bounds on achievable network throughput.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Real-world industrial case studies in high-speed enterprise Ethernet, long-haul DWDM optical fiber transceivers, and 5G cellular RF architectures "
        "confirmed that Laplace-domain transfer functions directly underpin the design of high-speed equalizers, transimpedance amplifiers, and "
        "carrier synchronization loops deployed across modern network equipment.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "In synthesis, the report confirms that Laplace transform calculus bridges the critical interface between abstract operational mathematics "
        "and practical telecommunications engineering, providing undergraduate engineering students with the analytical competencies required to "
        "design, analyze, and optimize tomorrow's high-speed computer network infrastructures.",
        styles['ReportBody']
    ))

    doc.build(story, canvasmaker=AcademicNumberedCanvas)
    print(f"ReportLab build completed: {filename}")

if __name__ == '__main__':
    build_pdf()
