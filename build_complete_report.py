import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
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

# Colors matching the reference PDF and cover specification
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
            # Decorative Cover Page corner motifs
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
            # Elegant engineering corner ticks on pages 2-14
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
                                   "ZEAL COLLEGE OF ENGINEERING & RESEARCH | ELECTRONICS AND COMPUTER ENGINEERING")
            self.setStrokeColor(colors.HexColor("#D0D7DE"))
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
            self.drawCentredString(w / 2.0, 25, "CIE-2 Activity 3 & 4 • Application of Laplace Transform | Page 1")
        else:
            self.setStrokeColor(colors.HexColor("#D0D7DE"))
            self.setLineWidth(0.65)
            self.line(48, 36, w - 48, 36)
            self.setFont("TimesNewRoman", 8.5)
            self.setFillColor(HEADER_GRAY)
            footer_text = f"CIE-2 Activity 3 & 4 • Application of Laplace Transform | Page {pnum}"
            self.drawCentredString(w / 2.0, 25, footer_text)

        self.restoreState()


def get_styles():
    styles = getSampleStyleSheet()

    # Section Heading Style (Dark Blue, Cambria Bold, Centered)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='Cambria-Bold',
        fontSize=17,
        leading=21,
        textColor=DARK_BLUE,
        alignment=1, # Centered
        spaceAfter=4,
        spaceBefore=0
    ))

    # Section Heading Left Aligned
    styles.add(ParagraphStyle(
        name='SectionHeadingLeft',
        fontName='Cambria-Bold',
        fontSize=17,
        leading=21,
        textColor=DARK_BLUE,
        alignment=0, # Left
        spaceAfter=4,
        spaceBefore=0
    ))

    # Sub-heading Style
    styles.add(ParagraphStyle(
        name='SubHeading',
        fontName='Cambria-Bold',
        fontSize=11.5,
        leading=15,
        textColor=DARK_BLUE,
        alignment=0,
        spaceBefore=4,
        spaceAfter=3
    ))

    # Sub-sub-heading Style
    styles.add(ParagraphStyle(
        name='SubSubHeading',
        fontName='Cambria-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1A252F"),
        alignment=0,
        spaceBefore=3,
        spaceAfter=2
    ))

    # Body Text (Justified, Cambria, clean leading)
    styles.add(ParagraphStyle(
        name='ReportBody',
        fontName='Cambria',
        fontSize=9.8,
        leading=13.8,
        textColor=BODY_CHARCOAL,
        alignment=4, # Justified
        spaceAfter=4
    ))

    # Body Text Left-aligned
    styles.add(ParagraphStyle(
        name='ReportBodyLeft',
        fontName='Cambria',
        fontSize=9.5,
        leading=13.2,
        textColor=BODY_CHARCOAL,
        alignment=0,
        spaceAfter=3
    ))

    # Bullet Text
    styles.add(ParagraphStyle(
        name='ReportBullet',
        fontName='Cambria',
        fontSize=9.4,
        leading=13.2,
        textColor=BODY_CHARCOAL,
        alignment=4,
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=3
    ))

    # Math Equation Block (Centered, Cambria-Italic, Professional)
    styles.add(ParagraphStyle(
        name='MathEquation',
        fontName='Cambria-Italic',
        fontSize=10.5,
        leading=14.5,
        textColor=DARK_BLUE,
        alignment=1,
        spaceBefore=3,
        spaceAfter=3
    ))

    # Math Definition / Variable list
    styles.add(ParagraphStyle(
        name='MathVariableDef',
        fontName='Cambria',
        fontSize=8.8,
        leading=12.2,
        textColor=colors.HexColor("#334155"),
        alignment=4,
        leftIndent=10,
        spaceAfter=3
    ))

    # Caption Style
    styles.add(ParagraphStyle(
        name='FigureCaption',
        fontName='Cambria-Italic',
        fontSize=8.2,
        leading=10.5,
        textColor=colors.HexColor("#333333"),
        alignment=1,
        spaceBefore=2,
        spaceAfter=4
    ))

    # Cover Page Specific Styles
    styles.add(ParagraphStyle(
        name='CoverActivity',
        fontName='Cambria-Bold',
        fontSize=14,
        leading=18,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=12
    ))

    styles.add(ParagraphStyle(
        name='CoverReportOn',
        fontName='Cambria',
        fontSize=11.5,
        leading=15,
        textColor=BODY_CHARCOAL,
        alignment=1,
        spaceAfter=14
    ))

    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName='Cambria-Bold',
        fontSize=20,
        leading=25,
        textColor=DARK_BLUE,
        alignment=1,
        spaceAfter=18
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

    # STRICT: All students have completely identical font size, weight, and formatting
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
        fontSize=10.5,
        leading=17,
        textColor=BODY_CHARCOAL,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='TOCItemPage',
        fontName='Cambria-Bold',
        fontSize=10.5,
        leading=17,
        textColor=DARK_BLUE,
        alignment=2 # Right
    ))

    return styles

def build_pdf(filename="Engineering_Mathematics_III_Report_Robotic_Arm_Laplace.pdf"):
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

    def make_divider(width=487, height=1.5, color=TEAL_DIVIDER, spaceAfter=8):
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
    story.append(Paragraph("APPLICATION OF LAPLACE TRANSFORM<br/>IN<br/>ROBOTIC ARM MOVEMENT", styles['CoverTitle']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("By –", styles['CoverBy']))
    story.append(Paragraph("SY ECE<br/>Div-A", styles['CoverDeptClass']))
    story.append(Spacer(1, 6))

    # Students Table - Strictly equal, no bold, no "Team Leader", identical formatting
    students_data = [
        [Paragraph("1.", styles['CoverStudentName']), Paragraph("EC2149", styles['CoverStudentName']), Paragraph("Rutvij Kotwal", styles['CoverStudentName'])],
        [Paragraph("2.", styles['CoverStudentName']), Paragraph("EC2150", styles['CoverStudentName']), Paragraph("Piyush Salgude", styles['CoverStudentName'])],
        [Paragraph("3.", styles['CoverStudentName']), Paragraph("EC2151", styles['CoverStudentName']), Paragraph("Trisha Moolya", styles['CoverStudentName'])],
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
    story.append(make_divider(spaceAfter=20))
    story.append(Spacer(1, 12))

    toc_items = [
        ("1. Abstract", "3"),
        ("2. Introduction", "4"),
        ("3. Definition of Robotic Arm Movement", "5"),
        ("4. Mathematical Analysis", "6"),
        ("5. Applications of Mathematics in Robotic Arm Movement", "7"),
        ("6. Laplace Transform – Definition and Basic Formula", "8"),
        ("7. Properties and Inverse Laplace Transform", "9"),
        ("8. Core Mathematical Concepts & Applications Matrix", "10"),
        ("9. Real-Life Industry Exposure", "11"),
        ("10. Application of Laplace Transform in Robotic Arm Movement", "12"),
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
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#EAECEE")),
    ]))
    story.append(t_toc)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: 1. ABSTRACT
    # =========================================================================
    story.append(Paragraph("1. Abstract", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "Robotic arm movement forms the technological cornerstone of modern automated manufacturing, precision surgery, "
        "and aerospace manipulation. The operational accuracy, dynamic responsiveness, and trajectory tracking of multi-axis "
        "articulated arms depend upon the rigorous mathematical modeling of rotational dynamics, joint kinematics, and closed-loop "
        "motor actuation. The Laplace Transform provides the indispensable analytical foundation for transforming complex, coupled "
        "second-order differential equations of motion into elegant, solvable algebraic expressions in the complex frequency <i>s</i>-domain. "
        "Key aspects addressed in this report include:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "• <b>Dynamic Modeling & Joint Mechanics:</b> Formulation of torque-inertia-damping differential relationships governing "
        "actuator response across each degree of freedom, accounting for motor electrical resistance, back-EMF, and load inertia.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Laplace Domain Operational Calculus:</b> Application of unilateral Laplace transforms to map continuous time-domain "
        "signals into operational transfer functions, eliminating cumbersome convolution and higher-order calculus.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Transient Response & Kinematic Stability:</b> Evaluation of characteristic equations, damping ratios, and natural "
        "frequencies to prevent overshoot, mechanical vibration, and structural resonance during high-speed industrial trajectories.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Closed-Loop Trajectory Control:</b> Integration of PID compensators in the <i>s</i>-domain to guarantee precise angular "
        "positioning and zero steady-state tracking error across multi-joint mechanical links.",
        styles['ReportBullet']
    ))

    story.append(Spacer(1, 4))
    if os.path.exists('report_assets/diagram_abstract.png'):
        story.append(RLImage('report_assets/diagram_abstract.png', width=240, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 1.1: Schematic Representation of an Articulated Robotic Manipulator.", styles['FigureCaption']))

    story.append(Paragraph(
        "Modern embedded servo controllers implement frequency-domain transfer function principles directly within digital signal "
        "processors, making Laplace Transform calculus essential for real-world robotics engineering.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: 2. INTRODUCTION
    # =========================================================================
    story.append(Paragraph("2. Introduction", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "Robotic manipulators have transitioned from simple pick-and-place automation into sophisticated multi-axis cyber-physical "
        "systems capable of high-precision assembly, microscopic microsurgery, and hazardous environment exploration. An articulated "
        "robotic arm consists of a kinematic chain of rigid links connected by revolute or prismatic joints, powered by electric actuators "
        "and guided by real-time sensor feedback. Achieving smooth, jitter-free spatial movement requires simultaneous coordination of "
        "multiple degrees of freedom (DOF).",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "While geometry and matrix algebra define the static spatial configuration of the arm (kinematics), the actual physical "
        "motion is governed by continuous mechanical dynamics. Each joint is driven by an electric servomotor whose "
        "armature circuit and rotor inertia are described by coupled, ordinary differential equations (ODEs). "
        "Directly solving these differential equations in the continuous time domain becomes analytically intractable when dealing with "
        "varying inertia, external payloads, and multi-variable feedback controllers.",
        styles['ReportBody']
    ))

    if os.path.exists('report_assets/diagram_labelled_arm.png'):
        story.append(RLImage('report_assets/diagram_labelled_arm.png', width=380, height=205, hAlign='CENTER'))
        story.append(Paragraph("Figure 2.1: Labelled Architectural Overview of an Industrial 6-Axis Articulated Robotic Arm.", styles['FigureCaption']))

    story.append(Paragraph(
        "Herein lies the profound power of <b>Engineering Mathematics III</b>: the <b>Laplace Transform</b> transforms linear differential "
        "equations into simple algebraic polynomials in the <i>s</i>-domain. By evaluating system transfer functions, engineering students "
        "and control engineers can predict angular displacement θ(t), angular velocity ω(t), and acceleration α(t), while optimizing "
        "controller parameters to eliminate mechanical oscillation and guarantee trajectory fidelity.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: 3. DEFINITION OF ROBOTIC ARM MOVEMENT
    # =========================================================================
    story.append(Paragraph("3. Definition of Robotic Arm Movement", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "<b>Robotic arm movement</b> is formally defined as the controlled spatial displacement, orientation, and trajectory execution "
        "of an open kinematic chain of rigid structural links interconnected by kinematic joints, transforming operational actuator torques "
        "into precise end-effector spatial trajectories under the governance of feedback sensors and mathematical control algorithms.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "At its foundational mechanical and mathematical level, robotic arm movement comprises five core structural components:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "• <b>Rigid Links:</b> Structural mechanical members of fixed length <i>L<sub>i</sub></i>, mass <i>m<sub>i</sub></i>, and moment of "
        "inertia <i>J<sub>i</sub></i> that maintain rigid spatial separation between adjacent kinematic joint axes.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Kinematic Joints & Degrees of Freedom:</b> Mechanical articulations providing rotational (revolute, 1-DOF) or translational (prismatic) "
        "motion. A standard articulated arm possesses 6 degrees of freedom (waist, shoulder, elbow, and 3-axis wrist).",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>Base Coordinate Frame:</b> The stationary global reference frame {0} rigidly anchored to the mounting foundation, against "
        "which all subsequent link position vectors are mathematically referenced.",
        styles['ReportBullet']
    ))
    story.append(Paragraph(
        "• <b>End-Effector (Tool):</b> The terminal operational device (gripper, welding torch, or surgical instrument) whose task-space "
        "coordinates <i>P(x, y, z)</i> and orientation angles (roll, pitch, yaw) define the ultimate movement objective.",
        styles['ReportBullet']
    ))

    if os.path.exists('report_assets/diagram_links_joints.png'):
        story.append(RLImage('report_assets/diagram_links_joints.png', width=370, height=175, hAlign='CENTER'))
        story.append(Paragraph("Figure 3.1: Kinematic Chain Architecture Representing Links, Joints, and End-Effector Frame.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Fundamental Joint Dynamic Equation:</b> In rotational motion, the dynamic torque balance for each joint actuator is expressed as:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<i>J · (d²θ(t) / dt²) + B · (dθ(t) / dt) + τ<sub>L</sub>(t) = τ<sub>m</sub>(t) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 3.1)</i>",
        styles['MathEquation']
    ))
    story.append(Paragraph(
        "where <i>J</i> is total equivalent mass moment of inertia (kg·m²), <i>B</i> is equivalent viscous damping coefficient (N·m·s/rad), "
        "<i>θ(t)</i> is joint angular displacement (rad), <i>τ<sub>L</sub>(t)</i> is external load torque, and <i>τ<sub>m</sub>(t)</i> is electromagnetic actuator torque.",
        styles['MathVariableDef']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: 4. MATHEMATICAL ANALYSIS
    # =========================================================================
    story.append(Paragraph("4. Mathematical Analysis", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "<b>Core Function:</b> Mathematical analysis provides the quantitative formulation of robotic motion—utilizing coordinate "
        "transformations, vector calculus, and differential equations to map operational motor torques into precise end-effector spatial trajectories.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<b>Key Mechanism (Kinematic Vector Summation):</b> For a multi-link planar manipulator, the end-effector position vector "
        "<b>P</b>(t) is synthesized by vector addition of individual link vectors: <b>P</b>(t) = <b>r</b>₁(t) + <b>r</b>₂(t). "
        "Projecting onto Cartesian axes yields the forward positional equations:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<i>x(t) = L₁ cos θ₁(t) + L₂ cos(θ₁(t) + θ₂(t)) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 4.1)</i><br/>"
        "<i>y(t) = L₁ sin θ₁(t) + L₂ sin(θ₁(t) + θ₂(t)) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 4.2)</i>",
        styles['MathEquation']
    ))
    story.append(Paragraph(
        "where <i>L₁</i> and <i>L₂</i> represent the link lengths, and <i>θ₁(t)</i> and <i>θ₂(t)</i> denote the respective joint rotation angles.",
        styles['MathVariableDef']
    ))

    if os.path.exists('report_assets/diagram_math_coord.png'):
        story.append(RLImage('report_assets/diagram_math_coord.png', width=360, height=180, hAlign='CENTER'))
        story.append(Paragraph("Figure 4.1: Mathematical Coordinate System, Vector Addition, and Trajectory Angles.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Differential Motion via the Jacobian Matrix:</b> Differentiating spatial position with respect to time yields the end-effector "
        "linear velocity vector <b>v</b>(t) = [dx/dt, dy/dt]ᵀ = <b>J</b>(θ) · [dθ₁/dt, dθ₂/dt]ᵀ, where <b>J</b>(θ) is the robotic Jacobian matrix:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<b>J</b>(θ) = [ [ -L₁ sin θ₁ - L₂ sin(θ₁ + θ₂), &nbsp; -L₂ sin(θ₁ + θ₂) ], &nbsp; [ L₁ cos θ₁ + L₂ cos(θ₁ + θ₂), &nbsp; L₂ cos(θ₁ + θ₂) ] ] &nbsp;&nbsp; --- (Eq. 4.3)",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "<b>Fundamental Limitation:</b> Real-world mechanical manipulators exhibit non-linear Coriolis accelerations and gravitational "
        "cross-coupling terms. Direct time-domain integration requires heavy numerical computing. Laplace transforms circumvent this limitation "
        "by linearizing system dynamics around operating trajectories, enabling highly stable, decoupled joint control.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: 5. APPLICATIONS OF MATHEMATICS IN ROBOTIC ARM MOVEMENT
    # =========================================================================
    story.append(Paragraph("5. Applications of Mathematics in Robotic Arm Movement", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "<b>1. Forward and Inverse Kinematics:</b> Forward Kinematics (FK) computes the end-effector Cartesian coordinates (x, y) given "
        "the measured joint angles (θ₁, θ₂). Conversely, <b>Inverse Kinematics (IK)</b> computes the necessary joint angles required to reach "
        "a target spatial position (x, y). Inverting the non-linear trigonometric equations via the law of cosines yields:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "cos θ₂ = (x² + y² - L₁² - L₂²) / (2 · L₁ · L₂) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 5.1)<br/>"
        "θ₁ = atan2(y, x) - atan2(L₂ sin θ₂, L₁ + L₂ cos θ₂) &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 5.2)",
        styles['MathEquation']
    ))

    if os.path.exists('report_assets/diagram_kinematics.png'):
        story.append(RLImage('report_assets/diagram_kinematics.png', width=380, height=160, hAlign='CENTER'))
        story.append(Paragraph("Figure 5.1: Geometric Analysis of Forward and Inverse Kinematic Solutions.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>2. Rotation Matrices & Coordinate Transformations:</b> Orientation changes between successive joint frames are computed using "
        "orthonormal 3×3 rotation matrices <i>R<sub>z</sub>(θ)</i> satisfying <i>R⁻¹ = Rᵀ</i> and <i>det(R) = +1</i>:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<i>R<sub>z</sub>(θ) = [ [ cos θ, -sin θ, 0 ], &nbsp; [ sin θ, cos θ, 0 ], &nbsp; [ 0, 0, 1 ] ] &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 5.3)</i>",
        styles['MathEquation']
    ))

    if os.path.exists('report_assets/diagram_flowchart.png'):
        story.append(RLImage('report_assets/diagram_flowchart.png', width=380, height=150, hAlign='CENTER'))
        story.append(Paragraph("Figure 5.2: Functional Closed-Loop Signal Flow of Robotic Arm Control.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>3. Closed-Loop Signal Architecture:</b> Real-time control maps target path commands through inverse kinematics, generating "
        "instantaneous position error signals <i>e(t)</i> that drive joint servomotors via Laplace-domain feedback compensators.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: 6. LAPLACE TRANSFORM – DEFINITION AND BASIC FORMULA
    # =========================================================================
    story.append(Paragraph("6. Laplace Transform – Definition and Basic Formula", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "<b>Mathematical Definition:</b> Let <i>f(t)</i> be a continuous or piecewise continuous function defined for all time <i>t ≥ 0</i>. "
        "The unilateral Laplace Transform of <i>f(t)</i>, denoted as <b>L{f(t)}</b> or <i>F(s)</i>, is defined by the improper integral:",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "<i>L{f(t)} = F(s) = ∫₀^∞ e^(-st) · f(t) dt &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 6.1)</i>",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "where <i>s = σ + jω</i> is a complex frequency variable (rad/s), <i>σ</i> is the attenuation coefficient, <i>ω</i> is the angular oscillation frequency, "
        "and <i>j = √(-1)</i>. The integral converges in the half-plane of the complex <i>s</i>-domain where <i>Re(s) > σ₀</i>, with <i>σ₀</i> being the abscissa of convergence.",
        styles['MathVariableDef']
    ))

    # Standard Laplace Table
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
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_laplace)
    story.append(Spacer(1, 4))

    if os.path.exists('report_assets/diagram_laplace_concept.png'):
        story.append(RLImage('report_assets/diagram_laplace_concept.png', width=370, height=135, hAlign='CENTER'))
        story.append(Paragraph("Figure 6.1: Operational Mapping between Time Domain f(t) and Complex Frequency Domain F(s).", styles['FigureCaption']))

    story.append(Paragraph(
        "By mapping differential operators into multiplications by algebraic variable <i>s</i>, the Laplace transform allows control "
        "engineers to solve robotic dynamic equations through straightforward algebraic factorization.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: 7. PROPERTIES AND INVERSE LAPLACE TRANSFORM
    # =========================================================================
    story.append(Paragraph("7. Properties and Inverse Laplace Transform", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph("<b>Fundamental Operational Theorems of the Laplace Transform:</b>", styles['SubHeading']))
    story.append(Paragraph(
        "1. <b>Linearity:</b> <i>L{c₁ f₁(t) + c₂ f₂(t)} = c₁ F₁(s) + c₂ F₂(s)</i> for arbitrary scalar constants <i>c₁, c₂</i>.<br/>"
        "2. <b>First Shifting (Frequency Translation):</b> If <i>L{f(t)} = F(s)</i>, then <i>L{e^(at) f(t)} = F(s - a)</i>.<br/>"
        "3. <b>Second Shifting (Time Delay):</b> <i>L{f(t - a) · u(t - a)} = e^(-as) · F(s)</i> (models actuator response latencies).<br/>"
        "4. <b>Differentiation:</b> <i>L{df/dt} = s F(s) - f(0)</i> &nbsp;&nbsp;|&nbsp;&nbsp; <i>L{d²f/dt²} = s² F(s) - s f(0) - f'(0)</i>.<br/>"
        "5. <b>Integration:</b> <i>L{∫₀ᵗ f(τ) dτ} = (1/s) F(s)</i> (vital for evaluating integral PID action in servo loops).",
        styles['ReportBody']
    ))

    # Solved Example 1
    ex1_text = (
        "<b>Solved Example 1: Partial Fraction Evaluation of Robotic Arm Velocity Response</b><br/>"
        "A DC motor powering a robotic joint has an angular velocity transfer function: "
        "<i>Ω(s) = 6 / [ s (s + 2) (s + 3) ]</i>. Determine the complete time response <i>ω(t)</i>.<br/>"
        "<b>Step 1: Partial Fraction Expansion:</b> <i>6 / [ s (s + 2) (s + 3) ] = A / s + B / (s + 2) + C / (s + 3)</i><br/>"
        "• <i>A = [ 6 / ((s + 2)(s + 3)) ]_(s = 0) = 6 / (2 · 3) = 1</i><br/>"
        "• <i>B = [ 6 / (s (s + 3)) ]_(s = -2) = 6 / (-2 · 1) = -3</i><br/>"
        "• <i>C = [ 6 / (s (s + 2)) ]_(s = -3) = 6 / (-3 · -1) = 2</i><br/>"
        "<b>Step 2: Inverse Transform:</b> <i>ω(t) = L⁻¹{ 1/s - 3/(s + 2) + 2/(s + 3) } = (1 - 3 e^(-2t) + 2 e^(-3t)) · u(t)</i> rad/s.<br/>"
        "<b>Physical Conclusion:</b> At <i>t = 0</i>, <i>ω(0) = 1 - 3 + 2 = 0</i> rad/s (joint starts smoothly from rest). "
        "As <i>t → ∞</i>, <i>ω(∞) = 1.0</i> rad/s (reaches target angular velocity with zero steady-state error)."
    )
    t_ex1 = Table([[Paragraph(ex1_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ex1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, TEAL_DIVIDER),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ex1)
    story.append(Spacer(1, 5))

    # Solved Example 2 (CORRECTED: Exact inverse transform, no phase form!)
    ex2_text = (
        "<b>Solved Example 2: Second-Order Joint Angular Position Step Response</b><br/>"
        "A closed-loop robot shoulder joint has an angular position equation: <i>Θ(s) = 25 / [ s (s² + 6s + 25) ]</i>. Find <i>θ(t)</i>.<br/>"
        "<b>Step 1: Completing the Square:</b> <i>s² + 6s + 25 = (s + 3)² + 4²</i> with natural frequency <i>ω_n = 5</i> rad/s, damping <i>ζ = 0.6</i>.<br/>"
        "<b>Step 2: Partial Fractions Expansion:</b> <i>25 / [ s (s² + 6s + 25) ] = A / s + (B s + C) / [ (s + 3)² + 4² ]</i><br/>"
        "Evaluating residues yields <i>A = 1</i>, <i>B = -1</i>, <i>C = -6</i>.<br/>"
        "Rewriting the quadratic numerator: <i>- (s + 6) = - (s + 3) - (3/4) · 4</i>.<br/>"
        "<b>Step 3: Exact Inverse Laplace Transform via First Shifting Property:</b><br/>"
        "<i>θ(t) = [ 1 − e⁻³ᵗ cos(4t) − (3/4) e⁻³ᵗ sin(4t) ] · u(t)</i> &nbsp;&nbsp;&nbsp;&nbsp; (for <i>t ≥ 0</i>)<br/>"
        "<b>Physical Interpretation:</b> The joint responds rapidly to the target command angle, decaying exponentially within 1.33 seconds (settling time <i>4/σ = 4/3 s</i>) with zero steady-state error."
    )
    t_ex2 = Table([[Paragraph(ex2_text, styles['ReportBody'])]], colWidths=[475], hAlign='CENTER')
    t_ex2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#16A34A")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ex2)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: 8. CORE MATHEMATICAL CONCEPTS & APPLICATIONS MATRIX
    # =========================================================================
    story.append(Paragraph("8. Core Mathematical Concepts & Applications Matrix", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=10))

    matrix_data = [
        [
            Paragraph("<b>Mathematical Foundation</b>", styles['ReportBodyLeft']),
            Paragraph("<b>Core Mechanism</b>", styles['ReportBodyLeft']),
            Paragraph("<b>Robotic Arm Practical Application</b>", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>Unilateral Laplace Transform</b>", styles['ReportBodyLeft']),
            Paragraph("Integral mapping from continuous time <i>t</i> to complex frequency domain <i>s = σ + jω</i>.", styles['ReportBodyLeft']),
            Paragraph("Derivation of joint transfer functions <i>G(s) = Θ(s)/V(s)</i> for armature-controlled DC servomotors. (Note: Stepper motors require distinct discrete step-pulse models).", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>Differentiation Property</b><br/><i>L{f'} = sF - f(0)</i><br/><i>L{f''} = s²F - sf(0) - f'(0)</i>", styles['ReportBodyLeft']),
            Paragraph("Transforms time derivatives into algebraic multiplication by <i>s</i> while capturing initial states.", styles['ReportBodyLeft']),
            Paragraph("Incorporating non-zero initial joint positions <i>θ(0)</i> and velocities <i>θ'(0)</i> during dynamic trajectory restarts.", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>First Shifting Theorem</b><br/><i>L{e^(at) f(t)} = F(s - a)</i>", styles['ReportBodyLeft']),
            Paragraph("Frequency translation corresponding to exponential envelope decay in the time domain.", styles['ReportBodyLeft']),
            Paragraph("Quantifying mechanical friction and electromagnetic damping coefficients to prevent arm oscillation.", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>Second Shifting Theorem</b><br/><i>L{f(t-a) u(t-a)} = e^(-as) F(s)</i>", styles['ReportBodyLeft']),
            Paragraph("Multiplication by complex phase factor <i>e^(-as)</i> representing pure transport latency.", styles['ReportBodyLeft']),
            Paragraph("Modeling transmission and CAN-bus propagation delays in tele-operated medical and space robots.", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>Partial Fraction Decomposition</b>", styles['ReportBodyLeft']),
            Paragraph("Splitting complex high-order rational fractions into sum of simple first- and second-order terms.", styles['ReportBodyLeft']),
            Paragraph("Solving analytical time-domain step and ramp responses <i>θ(t)</i> for multi-joint arm controllers.", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>Final Value Theorem</b><br/><i>lim<sub>t→∞</sub> f(t) = lim<sub>s→0</sub> s·F(s)</i>", styles['ReportBodyLeft']),
            Paragraph("Direct steady-state extraction.<br/><b>Validity Condition:</b> All poles of <i>s·F(s)</i> must lie strictly in the open left half-plane (OLHP). No poles in RHP or on imaginary axis.", styles['ReportBodyLeft']),
            Paragraph("Calculating steady-state positioning error <i>e<sub>ss</sub></i> under constant payload gravitational torque.", styles['ReportBodyLeft'])
        ],
        [
            Paragraph("<b>S-Plane Pole-Zero Analysis</b>", styles['ReportBodyLeft']),
            Paragraph("Roots of denominator <i>D(s) = 0</i> determine exponential growth, oscillation, or stable decay.", styles['ReportBodyLeft']),
            Paragraph("Tuning closed-loop damping ratio <i>ζ = 1.0</i> to achieve critically damped, overshoot-free movement.", styles['ReportBodyLeft'])
        ],
    ]

    t_matrix = Table(matrix_data, colWidths=[125, 170, 180], hAlign='CENTER')
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), TABLE_HDR_BG),
        ('TEXTCOLOR', (0,0), (-1,0), DARK_BLUE),
        ('GRID', (0,0), (-1,-1), 0.6, TABLE_BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_matrix)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: 9. REAL-LIFE INDUSTRY EXPOSURE
    # =========================================================================
    story.append(Paragraph("9. Real-Life Industry Exposure", styles['SectionHeadingLeft']))
    story.append(make_divider(spaceAfter=8))

    story.append(Paragraph(
        "Robotic arm kinematics and Laplace transform dynamic control are universally applied across critical modern engineering "
        "industries. Mathematical modeling allows engineers to simulate, optimize, and guarantee sub-millimeter precision before fabrication.",
        styles['ReportBody']
    ))

    # Industry 1: Automotive
    story.append(Paragraph("<b>1. Automotive Manufacturing (Robotic Spot Welding & Assembly)</b>", styles['SubSubHeading']))
    story.append(Paragraph(
        "Automotive assembly plants employ massive arrays of 6-axis articulated robots (such as KUKA and FANUC) to execute resistance spot "
        "welding, seam sealing, and chassis assembly. Controlling a 200 kg welding gun at speeds exceeding 2 m/s requires high-gain servo control. "
        "Engineers utilize second-order Laplace transfer functions to eliminate structural vibrations that could cause weld misalignment.",
        styles['ReportBody']
    ))
    if os.path.exists('report_assets/industry_automotive.jpg'):
        story.append(RLImage('report_assets/industry_automotive.jpg', width=380, height=125, hAlign='CENTER'))
        story.append(Paragraph("Figure 9.1: Automated 6-Axis Spot Welding Robotic Cell in Automotive Body Assembly Line.", styles['FigureCaption']))

    # Industry 2: Medical
    story.append(Paragraph("<b>2. Medical & Surgical Robotics (Minimally Invasive Surgery)</b>", styles['SubSubHeading']))
    story.append(Paragraph(
        "Surgical systems like the <i>da Vinci</i> robotic platform translate surgeon master-console movements into microscopic slave-arm motions "
        "inside the patient. Laplace transform transfer functions model low-pass tremor cancellation filters and tele-operation communication delays, "
        "guaranteeing absolute positional accuracy and haptic safety.",
        styles['ReportBody']
    ))
    if os.path.exists('report_assets/industry_medical.jpg'):
        story.append(RLImage('report_assets/industry_medical.jpg', width=380, height=120, hAlign='CENTER'))
        story.append(Paragraph("Figure 9.2: Da Vinci Multi-Arm Precision Surgical Robot in Minimally Invasive Laparoscopy.", styles['FigureCaption']))

    # Industry 3: Assembly & Packaging
    story.append(Paragraph("<b>3. Industrial Pick-and-Place & Packaging</b>", styles['SubSubHeading']))
    story.append(Paragraph(
        "High-speed SCARA and Delta robots package electronics and pharmaceuticals at rates exceeding 150 cycles per minute. Fast transient "
        "response without overshoot—achieved through critically damped Laplace pole placement—prevents delicate component damage.",
        styles['ReportBody']
    ))
    if os.path.exists('report_assets/industry_assembly.jpg'):
        story.append(RLImage('report_assets/industry_assembly.jpg', width=380, height=115, hAlign='CENTER'))
        story.append(Paragraph("Figure 9.3: High-Speed Industrial SCARA Manipulator for Automated Component Assembly.", styles['FigureCaption']))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: 10. APPLICATION OF LAPLACE TRANSFORM IN ROBOTIC ARM MOVEMENT
    # =========================================================================
    story.append(Paragraph("10. Application of Laplace Transform in Robotic Arm Movement", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=6))

    story.append(Paragraph(
        "<b>Dynamic Derivation of Robotic Joint Motor Transfer Function:</b>",
        styles['SubHeading']
    ))
    story.append(Paragraph(
        "<b>Fundamental Modeling Assumptions:</b><br/>"
        "1. <b>Simplified Single-Joint Model:</b> The robotic manipulator is modeled as a rigid single link of effective moment of inertia <i>J</i> rotating about a fixed revolute axis.<br/>"
        "2. <b>Zero Initial Conditions:</b> The joint starts from rest with zero initial storage: <i>i<sub>a</sub>(0) = 0</i>, <i>θ(0) = 0</i>, and <i>θ'(0) = 0</i>.<br/>"
        "3. <b>Linear Governing Equations:</b> Electrical and mechanical subsystems obey linear ordinary differential equations, neglecting magnetic saturation and gearbox backlash.",
        styles['ReportBody']
    ))

    story.append(Paragraph(
        "The governing electrical armature loop and rotational mechanical equations in the time domain are:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<i>v<sub>a</sub>(t) = R<sub>a</sub> i<sub>a</sub>(t) + L<sub>a</sub> (di<sub>a</sub>/dt) + e<sub>b</sub>(t), &nbsp;&nbsp;&nbsp;&nbsp; e<sub>b</sub>(t) = K<sub>b</sub> (dθ/dt)</i><br/>"
        "<i>J (d²θ/dt²) + B (dθ/dt) = τ<sub>m</sub>(t) = K<sub>t</sub> i<sub>a</sub>(t)</i>",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "Applying the unilateral Laplace transform with zero initial conditions yields the algebraic domain equations:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<i>V<sub>a</sub>(s) = (R<sub>a</sub> + L<sub>a</sub> s) I<sub>a</sub>(s) + K<sub>b</sub> s Θ(s), &nbsp;&nbsp;&nbsp;&nbsp; (J s² + B s) Θ(s) = K<sub>t</sub> I<sub>a</sub>(s)</i>",
        styles['MathEquation']
    ))

    story.append(Paragraph(
        "Substituting <i>I<sub>a</sub>(s) = (J s² + B s) Θ(s) / K<sub>t</sub></i> into the electrical equation produces the fundamental open-loop transfer function:",
        styles['ReportBody']
    ))
    story.append(Paragraph(
        "<b>G(s) = Θ(s) / V<sub>a</sub>(s) = K<sub>t</sub> / [ s · { (L<sub>a</sub> s + R<sub>a</sub>)(J s + B) + K<sub>t</sub> K<sub>b</sub> } ] &nbsp;&nbsp;&nbsp;&nbsp; --- (Eq. 10.1)</b>",
        styles['MathEquation']
    ))

    if os.path.exists('report_assets/diagram_motor_block.png'):
        story.append(RLImage('report_assets/diagram_motor_block.png', width=380, height=125, hAlign='CENTER'))
        story.append(Paragraph("Figure 10.1: Mathematical Block Diagram of Robotic Joint DC Servomotor in Laplace Domain.", styles['FigureCaption']))

    story.append(Paragraph(
        "<b>Transient Step Response & Damping Analysis:</b> Neglecting small motor inductance (<i>L<sub>a</sub> ≈ 0</i>), the closed-loop system behaves as "
        "a canonical second-order system: <i>Θ(s)/Θ<sub>d</sub>(s) = ω<sub>n</sub>² / (s² + 2ζω<sub>n</sub> s + ω<sub>n</sub>²) --- (Eq. 10.2)</i>. The damping ratio <i>ζ</i> determines behavior:",
        styles['ReportBody']
    ))

    if os.path.exists('report_assets/diagram_step_response.png'):
        story.append(RLImage('report_assets/diagram_step_response.png', width=380, height=130, hAlign='CENTER'))
        story.append(Paragraph("Figure 10.2: Joint Angular Transient Response θ(t) Under Varying Damping Conditions.", styles['FigureCaption']))

    story.append(Paragraph(
        "• <b>Underdamped (ζ < 1):</b> Rapid movement but excessive overshoot (<i>M<sub>p</sub></i>) causing mechanical collisions.<br/>"
        "• <b>Critically Damped (ζ = 1):</b> Ideal robotic trajectory—fastest possible convergence to target angle <i>θ<sub>target</sub></i> with zero overshoot.<br/>"
        "• <b>Overdamped (ζ > 1):</b> Sluggish motion causing delayed cycle times and poor servo bandwidth.",
        styles['ReportBullet']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 13: 11. CONCLUSION
    # =========================================================================
    story.append(Paragraph("11. Conclusion", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=14))

    story.append(Paragraph(
        "The mathematical investigation presented in this report establishes the indispensable role of the <b>Laplace Transform</b> in "
        "analyzing, modeling, and controlling modern robotic arm movement. What initially presents itself as a complex mechanical problem—comprising "
        "multi-axis coupled joints, non-linear inertial variations, rotational torque dynamics, and electrical actuator delays—is systematically "
        "reduced to solvable, rigorous engineering formulations through operational mathematics.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "By mapping continuous-time differential equations into the complex frequency <i>s</i>-domain, the Laplace Transform eliminates the "
        "intricacies of time-domain convolution integrals and higher-order calculus. It provides an intuitive, modular framework where "
        "motor armature circuits, mechanical rotor inertia, gear trains, and sensory feedback loops are represented as interconnected transfer "
        "function blocks. This modularity allows engineers to examine individual subsystem contributions and synthesize comprehensive closed-loop "
        "systems with predictable performance.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Furthermore, s-plane pole-zero analysis and partial fraction decomposition grant control engineers direct analytical authority over "
        "transient trajectory dynamics. By evaluating the damping ratio <i>ζ</i> and undamped natural frequency <i>ω<sub>n</sub></i>, engineers "
        "can tune joint controllers to achieve a critically damped state (<i>ζ = 1.0</i>). This guarantees rapid target positioning while "
        "completely eradicating overshoot and oscillatory resonance, which are fatal to high-precision tasks such as surgical incisions or "
        "microelectronic pick-and-place packaging.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "In modern multi-axis controllers, non-linear cross-coupling terms (such as Coriolis and centrifugal forces) are decoupled through "
        "computed torque control, establishing an inner linearized dynamic loop. Each independent joint axis is then seamlessly stabilized "
        "using classical Laplace-domain PID compensators. These analog transfer functions are subsequently discretized via bilinear transformations "
        "for real-time execution in embedded digital signal processors (DSPs) operating at multi-kilohertz frequencies.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Across the real-world manufacturing sectors examined—including automotive spot welding, aerospace carbon-fiber placement, and minimally "
        "invasive medical manipulation—theoretical Laplace models directly translate into digital DSP algorithms executed millions of times per second. "
        "Ultimately, the Laplace Transform is not merely an abstract mathematical tool, but the operational foundation enabling modern "
        "autonomous robotic manipulators to achieve the speed, repeatability, and micro-metric precision demanded by 21st-century industry.",
        styles['ReportBody']
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 14: 12. SUMMARY
    # =========================================================================
    story.append(Paragraph("12. Summary", styles['SectionHeading']))
    story.append(make_divider(spaceAfter=14))

    story.append(Paragraph(
        "This Engineering Mathematics III technical report delivers a thorough mathematical and practical analysis of robotic arm movement "
        "grounded in the principles of the Laplace Transform. Beginning with foundational kinematics, the report explores how physical links, "
        "revolute joints, and end-effector tools are represented mathematically through vector summation, coordinate frame transformations, "
        "and forward/inverse kinematic equations. The study demonstrates that while geometry determines static spatial positioning, dynamic "
        "motion requires continuous torque-inertia-damping differential modeling.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "The core mathematical framework centers on the unilateral Laplace transform: <i>F(s) = ∫₀^∞ e^(-st) f(t) dt</i>. Essential operational "
        "theorems—including linearity, frequency shifting, time delay, derivative properties (<i>L{f'} = sF - f(0)</i>, <i>L{f''} = s²F - sf(0) - f'(0)</i>), "
        "and integration—were systematically applied to electro-mechanical motor equations. A step-by-step solved example demonstrated the exact "
        "decomposition of high-order joint velocity functions into partial fractions, highlighting how asymptotic steady-state velocities are reached from rest.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "A comprehensive Core Mathematical Concepts and Applications Matrix codified eight key mathematical foundations against their robotic "
        "practical implementations, from transfer function derivation to transport delay compensation. Industrial case studies in automotive "
        "welding, surgical robotics, and high-speed electronics assembly confirmed that analytical s-domain pole placement directly prevents "
        "mechanical overshoot and guarantees structural stability under heavy payloads.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "The investigation underscores that the integration of classical operational calculus with contemporary mechatronics is vital for "
        "mastering complex multi-body dynamical systems. By mastering both the theoretical derivation of transfer functions and their physical "
        "transient response implications, engineers can bridge the gap between abstract mathematical theorems and tangible high-performance robotic machinery.",
        styles['ReportBody']
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "In synthesis, the report verifies that Laplace transform methods bridge the critical divide between abstract calculus and real-world "
        "mechatronics engineering, equipping future engineers with the analytical competencies needed to design, simulate, and deploy "
        "next-generation autonomous robotic manipulators across tomorrow's smart industrial ecosystems.",
        styles['ReportBody']
    ))

    doc.build(story, canvasmaker=AcademicNumberedCanvas)
    print(f"ReportLab build completed: {filename}")

if __name__ == '__main__':
    build_pdf()
