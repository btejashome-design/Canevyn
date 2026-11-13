import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def add_teal_divider(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(6)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="20809D"/></w:pBdr>')
    pPr.append(pBdr)

def build_docx(filename="Engineering_Mathematics_III_Report_Robotic_Arm_Laplace.docx"):
    doc = docx.Document()

    # Set page margins to 0.75 in (54 pt)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

        # Double-line engineering page border across document
        sectPr = section._sectPr
        pgBorders = parse_xml(f'''
            <w:pgBorders {nsdecls("w")} w:offsetFrom="page">
                <w:top w:val="double" w:sz="12" w:space="24" w:color="10366E"/>
                <w:left w:val="double" w:sz="12" w:space="24" w:color="10366E"/>
                <w:bottom w:val="double" w:sz="12" w:space="24" w:color="10366E"/>
                <w:right w:val="double" w:sz="12" w:space="24" w:color="10366E"/>
            </w:pgBorders>
        ''')
        sectPr.append(pgBorders)

        # Running Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        hp.paragraph_format.space_after = Pt(4)
        hrun = hp.add_run("ZEAL COLLEGE OF ENGINEERING & RESEARCH | ELECTRONICS AND COMPUTER ENGINEERING")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8.5)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(85, 85, 85)
        hpPr = hp._p.get_or_add_pPr()
        hpBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D0D7DE"/></w:pBdr>')
        hpPr.append(hpBdr)

        # Running Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("CIE-2 Activity 3 & 4 • Application of Laplace Transform | Engineering Mathematics III")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(85, 85, 85)

    # Base font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Cambria'
    font.size = Pt(10)
    font.color.rgb = RGBColor(34, 34, 34)

    # Helper functions
    def add_heading(text, align=WD_ALIGN_PARAGRAPH.CENTER):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(17)
        run.font.bold = True
        run.font.color.rgb = RGBColor(16, 54, 110) # Dark Blue #10366E
        add_teal_divider(doc)
        return p

    def add_subheading(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(16, 54, 110)
        return p

    def add_body(text, space_after=4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(9.8)
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r_bold = p.add_run(bold_prefix + " ")
        r_bold.font.name = "Cambria"
        r_bold.font.size = Pt(9.5)
        r_bold.font.bold = True
        r_text = p.add_run(text)
        r_text.font.name = "Cambria"
        r_text.font.size = Pt(9.5)
        return p

    def add_equation(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(10.5)
        run.font.italic = True
        run.font.bold = True
        run.font.color.rgb = RGBColor(16, 54, 110)
        return p

    def add_caption(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(5)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(8.5)
        run.font.italic = True
        run.font.color.rgb = RGBColor(60, 60, 60)
        return p

    def add_image_centered(img_path, width_in):
        if os.path.exists(img_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(2)
            p.add_run().add_picture(img_path, width=Inches(width_in))

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(5)
    p_inst.paragraph_format.space_after = Pt(1)
    r = p_inst.add_run("ZEAL COLLEGE OF ENGINEERING & RESEARCH")
    r.font.name = "Cambria"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    p_dept_hdr = doc.add_paragraph()
    p_dept_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dept_hdr.paragraph_format.space_after = Pt(4)
    r = p_dept_hdr.add_run("DEPARTMENT OF ELECTRONICS AND COMPUTER ENGINEERING")
    r.font.name = "Cambria"
    r.font.size = Pt(9)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    add_teal_divider(doc)

    p_act = doc.add_paragraph()
    p_act.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_act.paragraph_format.space_before = Pt(8)
    p_act.paragraph_format.space_after = Pt(4)
    r = p_act.add_run("CIE-2 Activity 3 & 4")
    r.font.name = "Cambria"
    r.font.size = Pt(13.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    p_rep = doc.add_paragraph()
    p_rep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_rep.paragraph_format.space_after = Pt(6)
    r = p_rep.add_run("A Report On")
    r.font.name = "Cambria"
    r.font.size = Pt(11.5)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(10)
    r = p_title.add_run("APPLICATION OF LAPLACE TRANSFORM\nIN\nROBOTIC ARM MOVEMENT")
    r.font.name = "Cambria"
    r.font.size = Pt(20)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    # Optional watermark/emblem preview on Word cover
    if os.path.exists('report_assets/watermark_cover.png'):
        p_wm = doc.add_paragraph()
        p_wm.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_wm.paragraph_format.space_before = Pt(0)
        p_wm.paragraph_format.space_after = Pt(2)
        p_wm.add_run().add_picture('report_assets/watermark_cover.png', width=Inches(1.8))

    p_by = doc.add_paragraph()
    p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_by.paragraph_format.space_after = Pt(1)
    r = p_by.add_run("By –")
    r.font.name = "Cambria"
    r.font.size = Pt(11)

    p_dept = doc.add_paragraph()
    p_dept.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dept.paragraph_format.space_after = Pt(6)
    r = p_dept.add_run("SY ECE\nDiv-A")
    r.font.name = "Cambria"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    # Students Table - Strictly equal, no bold, no "Team Leader"
    st_table = doc.add_table(rows=6, cols=3)
    st_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    students = [
        ("1.", "EC2149", "Rutvij Kotwal"),
        ("2.", "EC2150", "Piyush Salgude"),
        ("3.", "EC2151", "Trisha Moolya"),
        ("4.", "EC2152", "Saurabh Singh"),
        ("5.", "EC2153", "Radhika Sarnagire"),
        ("6.", "EC2154", "Bhumika Kale"),
    ]
    for idx, (num, roll, name) in enumerate(students):
        row = st_table.rows[idx]
        row.cells[0].width = Inches(0.4)
        row.cells[1].width = Inches(1.1)
        row.cells[2].width = Inches(3.0)
        
        p0 = row.cells[0].paragraphs[0]
        r0 = p0.add_run(num)
        r0.font.name = "Cambria"
        r0.font.size = Pt(10)
        
        p1 = row.cells[1].paragraphs[0]
        r1 = p1.add_run(roll)
        r1.font.name = "Cambria"
        r1.font.size = Pt(10)
        
        p2 = row.cells[2].paragraphs[0]
        r2 = p2.add_run(name)
        r2.font.name = "Cambria"
        r2.font.size = Pt(10)

    # Guide Block
    p_guide_lbl = doc.add_paragraph()
    p_guide_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_guide_lbl.paragraph_format.space_before = Pt(14)
    p_guide_lbl.paragraph_format.space_after = Pt(2)
    r = p_guide_lbl.add_run("Guide –")
    r.font.name = "Cambria"
    r.font.size = Pt(11.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(32, 128, 157) # Teal #20809D

    p_guide = doc.add_paragraph()
    p_guide.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_guide.paragraph_format.space_after = Pt(16)
    r = p_guide.add_run("Prof. Tejaswini Pawar")
    r.font.name = "Cambria"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    # College Footer
    p_c1 = doc.add_paragraph()
    p_c1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c1.paragraph_format.space_after = Pt(2)
    r = p_c1.add_run("Department Of Electronics and Computer Engineering")
    r.font.name = "Cambria"
    r.font.size = Pt(10.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)
    
    p_c2 = doc.add_paragraph()
    p_c2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_c2.paragraph_format.space_after = Pt(2)
    r = p_c2.add_run("ZEAL COLLEGE OF ENGINEERING & RESEARCH, PUNE – 41")
    r.font.name = "Cambria"
    r.font.size = Pt(10.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    p_c3 = doc.add_paragraph()
    p_c3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_c3.add_run("[2026-27]")
    r.font.name = "Cambria"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(32, 128, 157)

    doc.add_page_break()

    # =========================================================================
    # PAGE 2: TABLE OF CONTENTS
    # =========================================================================
    add_heading("TABLE OF CONTENTS")
    
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

    toc_table = doc.add_table(rows=len(toc_items), cols=2)
    toc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (title, page_str) in enumerate(toc_items):
        row = toc_table.rows[idx]
        row.cells[0].width = Inches(5.8)
        row.cells[1].width = Inches(0.8)
        
        p0 = row.cells[0].paragraphs[0]
        p0.paragraph_format.space_before = Pt(5)
        p0.paragraph_format.space_after = Pt(5)
        r0 = p0.add_run(title)
        r0.font.name = "Cambria"
        r0.font.size = Pt(10.5)

        p1 = row.cells[1].paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_before = Pt(5)
        p1.paragraph_format.space_after = Pt(5)
        r = p1.add_run(page_str)
        r.font.name = "Cambria"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(16, 54, 110)

    doc.add_page_break()

    # =========================================================================
    # PAGE 3: 1. ABSTRACT
    # =========================================================================
    add_heading("1. Abstract")
    add_body(
        "Robotic arm movement forms the technological cornerstone of modern automated manufacturing, precision surgery, "
        "and aerospace manipulation. The operational accuracy, dynamic responsiveness, and trajectory tracking of multi-axis "
        "articulated arms depend upon the rigorous mathematical modeling of rotational dynamics, joint kinematics, and closed-loop "
        "motor actuation. The Laplace Transform provides the indispensable analytical foundation for transforming complex, coupled "
        "second-order differential equations of motion into elegant, solvable algebraic expressions in the complex frequency s-domain. "
        "Key aspects addressed in this report include:"
    )

    add_bullet("Dynamic Modeling & Joint Mechanics:",
               "Formulation of torque-inertia-damping differential relationships governing actuator response across each degree of freedom, accounting for motor electrical resistance, back-EMF, and load inertia.")
    add_bullet("Laplace Domain Operational Calculus:",
               "Application of unilateral Laplace transforms to map continuous time-domain signals into operational transfer functions, eliminating cumbersome convolution and higher-order calculus.")
    add_bullet("Transient Response & Kinematic Stability:",
               "Evaluation of characteristic equations, damping ratios, and natural frequencies to prevent overshoot, mechanical vibration, and structural resonance during high-speed industrial trajectories.")
    add_bullet("Closed-Loop Trajectory Control:",
               "Integration of PID compensators in the s-domain to guarantee precise angular positioning and zero steady-state tracking error across multi-joint mechanical links.")

    add_image_centered('report_assets/diagram_abstract.png', width_in=3.6)
    add_caption("Figure 1.1: Schematic Representation of an Articulated Robotic Manipulator.")

    add_body(
        "Modern embedded servo controllers implement frequency-domain transfer function principles directly within digital signal "
        "processors, making Laplace Transform calculus essential for real-world robotics engineering."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 4: 2. INTRODUCTION
    # =========================================================================
    add_heading("2. Introduction")
    add_body(
        "Robotic manipulators have transitioned from simple pick-and-place automation into sophisticated multi-axis cyber-physical "
        "systems capable of high-precision assembly, microscopic microsurgery, and hazardous environment exploration. An articulated "
        "robotic arm consists of a kinematic chain of rigid links connected by revolute or prismatic joints, powered by electric actuators "
        "and guided by real-time sensor feedback. Achieving smooth, jitter-free spatial movement requires simultaneous coordination of "
        "multiple degrees of freedom (DOF)."
    )

    add_body(
        "While geometry and matrix algebra define the static spatial configuration of the arm (kinematics), the actual physical "
        "motion is governed by continuous mechanical dynamics. Each joint is driven by an electric servomotor whose "
        "armature circuit and rotor inertia are described by coupled, ordinary differential equations (ODEs). "
        "Directly solving these differential equations in the continuous time domain becomes analytically intractable when dealing with "
        "varying inertia, external payloads, and multi-variable feedback controllers."
    )

    add_image_centered('report_assets/diagram_labelled_arm.png', width_in=5.2)
    add_caption("Figure 2.1: Labelled Architectural Overview of an Industrial 6-Axis Articulated Robotic Arm.")

    add_body(
        "Herein lies the profound power of Engineering Mathematics III: the Laplace Transform transforms linear differential "
        "equations into simple algebraic polynomials in the s-domain. By evaluating system transfer functions, engineering students "
        "and control engineers can predict angular displacement θ(t), angular velocity ω(t), and acceleration α(t), while optimizing "
        "controller parameters to eliminate mechanical oscillation and guarantee trajectory fidelity."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 5: 3. DEFINITION OF ROBOTIC ARM MOVEMENT
    # =========================================================================
    add_heading("3. Definition of Robotic Arm Movement")
    add_body(
        "Robotic arm movement is formally defined as the controlled spatial displacement, orientation, and trajectory execution "
        "of an open kinematic chain of rigid structural links interconnected by kinematic joints, transforming operational actuator torques "
        "into precise end-effector spatial trajectories under the governance of feedback sensors and mathematical control algorithms."
    )

    add_body("At its foundational mechanical and mathematical level, robotic arm movement comprises five core structural components:")
    add_bullet("Rigid Links:", "Structural mechanical members of fixed length Li, mass mi, and moment of inertia Ji that maintain rigid spatial separation between adjacent kinematic joint axes.")
    add_bullet("Kinematic Joints & Degrees of Freedom:", "Mechanical articulations providing rotational (revolute, 1-DOF) or translational (prismatic) motion. A standard articulated arm possesses 6 degrees of freedom.")
    add_bullet("Base Coordinate Frame:", "The stationary global reference frame {0} rigidly anchored to the mounting foundation, against which all subsequent link position vectors are mathematically referenced.")
    add_bullet("End-Effector (Tool):", "The terminal operational device (gripper, welding torch, or surgical instrument) whose task-space coordinates P(x, y, z) and orientation angles define the ultimate movement objective.")

    add_image_centered('report_assets/diagram_links_joints.png', width_in=4.8)
    add_caption("Figure 3.1: Kinematic Chain Architecture Representing Links, Joints, and End-Effector Frame.")

    add_subheading("Fundamental Joint Dynamic Equation:")
    add_body("In rotational motion, the dynamic torque balance for each joint actuator is expressed as:")
    add_equation("J · (d²θ(t) / dt²) + B · (dθ(t) / dt) + τ_L(t) = τ_m(t)    --- (Eq. 3.1)")
    add_body("where J is total equivalent mass moment of inertia (kg·m²), B is equivalent viscous damping coefficient (N·m·s/rad), θ(t) is joint angular displacement (rad), τ_L(t) is external load torque, and τ_m(t) is electromagnetic actuator torque.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 6: 4. MATHEMATICAL ANALYSIS
    # =========================================================================
    add_heading("4. Mathematical Analysis")
    add_body("Core Function: Mathematical analysis provides the quantitative formulation of robotic motion—utilizing coordinate transformations, vector calculus, and differential equations to map operational motor torques into precise end-effector spatial trajectories.")

    add_subheading("Key Mechanism (Kinematic Vector Summation):")
    add_body("For a multi-link planar manipulator, the end-effector position vector P(t) is synthesized by vector addition of individual link vectors: P(t) = r₁(t) + r₂(t). Projecting onto Cartesian axes yields:")
    add_equation("x(t) = L₁ cos θ₁(t) + L₂ cos(θ₁(t) + θ₂(t))    --- (Eq. 4.1)\ny(t) = L₁ sin θ₁(t) + L₂ sin(θ₁(t) + θ₂(t))    --- (Eq. 4.2)")
    add_body("where L₁ and L₂ represent link lengths, and θ₁(t) and θ₂(t) denote joint rotation angles.")

    add_image_centered('report_assets/diagram_math_coord.png', width_in=4.8)
    add_caption("Figure 4.1: Mathematical Coordinate System, Vector Addition, and Trajectory Angles.")

    add_subheading("Differential Motion via the Jacobian Matrix:")
    add_body("Differentiating spatial position with respect to time yields the end-effector linear velocity vector v(t) = [dx/dt, dy/dt]ᵀ = J(θ) · [dθ₁/dt, dθ₂/dt]ᵀ, where J(θ) is the robotic Jacobian matrix:")
    add_equation("J(θ) = [ [ -L₁ sin θ₁ - L₂ sin(θ₁ + θ₂),  -L₂ sin(θ₁ + θ₂) ],  [ L₁ cos θ₁ + L₂ cos(θ₁ + θ₂),  L₂ cos(θ₁ + θ₂) ] ]    --- (Eq. 4.3)")

    add_body("Fundamental Limitation: Real-world mechanical manipulators exhibit non-linear Coriolis accelerations and gravitational cross-coupling terms. Direct time-domain integration requires heavy numerical computing. Laplace transforms circumvent this limitation by linearizing system dynamics around operating trajectories, enabling highly stable, decoupled joint control.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 7: 5. APPLICATIONS OF MATHEMATICS IN ROBOTIC ARM MOVEMENT
    # =========================================================================
    add_heading("5. Applications of Mathematics in Robotic Arm Movement")
    add_subheading("1. Forward and Inverse Kinematics:")
    add_body("Forward Kinematics (FK) computes the end-effector Cartesian coordinates (x, y) given measured joint angles (θ₁, θ₂). Conversely, Inverse Kinematics (IK) computes necessary joint angles to reach a target spatial position (x, y). Inverting non-linear trigonometric equations via the law of cosines yields:")
    add_equation("cos θ₂ = (x² + y² - L₁² - L₂²) / (2 · L₁ · L₂)    --- (Eq. 5.1)\nθ₁ = atan2(y, x) - atan2(L₂ sin θ₂, L₁ + L₂ cos θ₂)    --- (Eq. 5.2)")

    add_image_centered('report_assets/diagram_kinematics.png', width_in=4.8)
    add_caption("Figure 5.1: Geometric Analysis of Forward and Inverse Kinematic Solutions.")

    add_subheading("2. Rotation Matrices & Coordinate Transformations:")
    add_body("Orientation changes between successive joint frames are computed using orthonormal 3×3 rotation matrices R_z(θ) satisfying R⁻¹ = Rᵀ and det(R) = +1:")
    add_equation("R_z(θ) = [ [ cos θ, -sin θ, 0 ],  [ sin θ, cos θ, 0 ],  [ 0, 0, 1 ] ]    --- (Eq. 5.3)")

    add_image_centered('report_assets/diagram_flowchart.png', width_in=4.8)
    add_caption("Figure 5.2: Functional Closed-Loop Signal Flow of Robotic Arm Control.")

    add_body("3. Closed-Loop Signal Architecture: Real-time control maps target path commands through inverse kinematics, generating instantaneous position error signals e(t) that drive joint servomotors via Laplace-domain feedback compensators.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 8: 6. LAPLACE TRANSFORM – DEFINITION AND BASIC FORMULA
    # =========================================================================
    add_heading("6. Laplace Transform – Definition and Basic Formula")
    add_body(
        "Mathematical Definition: Let f(t) be a continuous or piecewise continuous function defined for all time t ≥ 0. "
        "The unilateral Laplace Transform of f(t), denoted as L{f(t)} or F(s), is defined by the improper integral:"
    )
    add_equation("L{f(t)} = F(s) = ∫₀^∞ e^(-st) · f(t) dt    --- (Eq. 6.1)")
    add_body(
        "where s = σ + jω is a complex frequency variable (rad/s), σ is attenuation coefficient, ω is angular oscillation frequency, "
        "and j = √(-1). The integral converges in the half-plane of the complex s-domain where Re(s) > σ₀, with σ₀ being the abscissa of convergence."
    )

    # Standard Laplace Pairs Table
    std_table_data = [
        ("Sr. No.", "Time Function f(t)", "Laplace Transform F(s) = L{f(t)}", "Region of Convergence"),
        ("1", "1 (Unit Step u(t))", "1 / s", "Re(s) > 0"),
        ("2", "tⁿ (n = 1, 2, ...)", "n! / sⁿ⁺¹", "Re(s) > 0"),
        ("3", "e^(at)", "1 / (s - a)", "Re(s) > a"),
        ("4", "sin(ωt)", "ω / (s² + ω²)", "Re(s) > 0"),
        ("5", "cos(ωt)", "s / (s² + ω²)", "Re(s) > 0"),
        ("6", "sinh(at)", "a / (s² - a²)", "Re(s) > |a|"),
        ("7", "cosh(at)", "s / (s² - a²)", "Re(s) > |a|"),
        ("8", "e^(at) · tⁿ", "n! / (s - a)ⁿ⁺¹", "Re(s) > a"),
    ]
    t_std = doc.add_table(rows=len(std_table_data), cols=4)
    t_std.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(std_table_data):
        for c_idx, val in enumerate(row):
            cell = t_std.rows[r_idx].cells[c_idx]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2.5)
            p.paragraph_format.space_after = Pt(2.5)
            run = p.add_run(val)
            run.font.name = "Cambria"
            run.font.size = Pt(8.5)
            if r_idx == 0:
                run.font.bold = True
                run.font.color.rgb = RGBColor(16, 54, 110)
                set_cell_background(cell, "EBF3FA")
            else:
                set_cell_background(cell, "FFFFFF" if r_idx % 2 == 1 else "F8FAFC")

    add_image_centered('report_assets/diagram_laplace_concept.png', width_in=4.8)
    add_caption("Figure 6.1: Operational Mapping between Time Domain f(t) and Complex Frequency Domain F(s).")

    add_body(
        "By mapping differential operators into multiplications by algebraic variable s, the Laplace transform allows control "
        "engineers to solve robotic dynamic equations through straightforward algebraic factorization."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 9: 7. PROPERTIES AND INVERSE LAPLACE TRANSFORM
    # =========================================================================
    add_heading("7. Properties and Inverse Laplace Transform")
    add_subheading("Fundamental Operational Theorems of the Laplace Transform:")
    add_body(
        "1. Linearity: L{c₁ f₁(t) + c₂ f₂(t)} = c₁ F₁(s) + c₂ F₂(s) for arbitrary scalar constants c₁, c₂.\n"
        "2. First Shifting (Frequency Translation): If L{f(t)} = F(s), then L{e^(at) f(t)} = F(s - a).\n"
        "3. Second Shifting (Time Delay): L{f(t - a) · u(t - a)} = e^(-as) · F(s) (models actuator response latencies).\n"
        "4. Differentiation: L{df/dt} = s F(s) - f(0)   --- (Eq. 7.1)  |  L{d²f/dt²} = s² F(s) - s f(0) - f'(0)   --- (Eq. 7.2)\n"
        "5. Integration: L{∫₀ᵗ f(τ) dτ} = (1/s) F(s) (vital for evaluating integral PID action in servo loops)."
    )

    add_subheading("Solved Mathematical Examples:")
    add_body(
        "Solved Example 1: Partial Fraction Evaluation of Robotic Arm Velocity Response\n"
        "A DC motor powering a robotic joint has an angular velocity transfer function: "
        "Ω(s) = 6 / [ s (s + 2) (s + 3) ]. Determine the complete time response ω(t).\n"
        "Step 1: Partial Fraction Expansion: 6 / [ s (s + 2) (s + 3) ] = A / s + B / (s + 2) + C / (s + 3)\n"
        "• A = [ 6 / ((s + 2)(s + 3)) ]_(s = 0) = 6 / (2 · 3) = 1\n"
        "• B = [ 6 / (s (s + 3)) ]_(s = -2) = 6 / (-2 · 1) = -3\n"
        "• C = [ 6 / (s (s + 2)) ]_(s = -3) = 6 / (-3 · -1) = 2\n"
        "Step 2: Inverse Transform: ω(t) = L⁻¹{ 1/s - 3/(s + 2) + 2/(s + 3) } = (1 - 3 e^(-2t) + 2 e^(-3t)) · u(t) rad/s.\n"
        "Physical Conclusion: At t = 0, ω(0) = 1 - 3 + 2 = 0 rad/s (joint starts smoothly from rest). "
        "As t → ∞, ω(∞) = 1.0 rad/s (reaches target angular velocity with zero steady-state error)."
    )

    add_body(
        "Solved Example 2: Second-Order Joint Angular Position Step Response (Mathematically Corrected)\n"
        "A closed-loop robot shoulder joint has an angular position equation: Θ(s) = 25 / [ s (s² + 6s + 25) ]. Find θ(t).\n"
        "Step 1: Completing the Square: s² + 6s + 25 = (s + 3)² + 4² with natural frequency ω_n = 5 rad/s, damping ζ = 0.6.\n"
        "Step 2: Partial Fractions Expansion: 25 / [ s (s² + 6s + 25) ] = A / s + (B s + C) / [ (s + 3)² + 4² ]\n"
        "Evaluating residues yields A = 1, B = -1, C = -6.\n"
        "Rewriting the quadratic numerator: - (s + 6) = - (s + 3) - (3/4) · 4.\n"
        "Step 3: Exact Inverse Laplace Transform via First Shifting Property:\n"
        "θ(t) = [ 1 − e⁻³ᵗ cos(4t) − (3/4) e⁻³ᵗ sin(4t) ] · u(t)      (for t ≥ 0)\n"
        "Physical Interpretation: The joint responds rapidly to the target command angle, decaying exponentially within 1.33 seconds (settling time 4/σ = 4/3 s) with zero steady-state error."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 10: 8. CORE MATHEMATICAL CONCEPTS & APPLICATIONS MATRIX
    # =========================================================================
    add_heading("8. Core Mathematical Concepts & Applications Matrix")

    matrix_data = [
        ("Mathematical Foundation", "Core Mechanism", "Robotic Arm Practical Application"),
        ("Unilateral Laplace Transform", "Integral mapping from continuous time t to complex frequency domain s = σ + jω.", "Derivation of joint transfer functions G(s) = Θ(s)/V(s) for armature-controlled DC servomotors. (Note: Stepper motors require distinct discrete step-pulse models)."),
        ("Differentiation Property\nL{f'} = sF - f(0)\nL{f''} = s²F - sf(0) - f'(0)", "Transforms time derivatives into algebraic multiplication by s while capturing initial states.", "Incorporating non-zero initial joint positions θ(0) and velocities θ'(0) during dynamic trajectory restarts."),
        ("First Shifting Theorem\nL{e^(at) f(t)} = F(s - a)", "Frequency translation corresponding to exponential envelope decay in the time domain.", "Quantifying mechanical friction and electromagnetic damping coefficients to prevent arm oscillation."),
        ("Second Shifting Theorem\nL{f(t-a) u(t-a)} = e^(-as) F(s)", "Multiplication by complex phase factor e^(-as) representing pure transport latency.", "Modeling transmission and CAN-bus propagation delays in tele-operated medical and space robots."),
        ("Partial Fraction Decomposition", "Splitting complex high-order rational fractions into sum of simple first- and second-order terms.", "Solving analytical time-domain step and ramp responses θ(t) for multi-joint arm controllers."),
        ("Final Value Theorem\nlim (t→∞) f(t) = lim (s→0) s·F(s)", "Direct steady-state extraction.\nValidity Condition: All poles of s·F(s) must lie strictly in the open left half-plane (OLHP). No poles in RHP or on imaginary axis.", "Calculating steady-state positioning error e_ss under constant payload gravitational torque."),
        ("S-Plane Pole-Zero Analysis", "Roots of denominator D(s) = 0 determine exponential growth, oscillation, or stable decay.", "Tuning closed-loop damping ratio ζ = 1.0 to achieve critically damped, overshoot-free movement."),
    ]

    t_mat = doc.add_table(rows=len(matrix_data), cols=3)
    t_mat.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r_idx, row in enumerate(matrix_data):
        for c_idx, val in enumerate(row):
            cell = t_mat.rows[r_idx].cells[c_idx]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(3.5)
            p.paragraph_format.space_after = Pt(3.5)
            run = p.add_run(val)
            run.font.name = "Cambria"
            run.font.size = Pt(8.5)
            if r_idx == 0:
                run.font.bold = True
                run.font.color.rgb = RGBColor(16, 54, 110)
                set_cell_background(cell, "EBF3FA")
            else:
                set_cell_background(cell, "FFFFFF" if r_idx % 2 == 1 else "F8FAFC")
            set_cell_margins(cell, top=100, bottom=100, left=130, right=130)

    doc.add_page_break()

    # =========================================================================
    # PAGE 11: 9. REAL-LIFE INDUSTRY EXPOSURE
    # =========================================================================
    add_heading("9. Real-Life Industry Exposure", align=WD_ALIGN_PARAGRAPH.LEFT)
    add_body(
        "Robotic arm kinematics and Laplace transform dynamic control are universally applied across critical modern engineering "
        "industries. Mathematical modeling allows engineers to simulate, optimize, and guarantee sub-millimeter precision before fabrication."
    )

    add_subheading("1. Automotive Manufacturing (Robotic Spot Welding & Assembly)")
    add_body(
        "Automotive assembly plants employ massive arrays of 6-axis articulated robots (such as KUKA and FANUC) to execute resistance spot "
        "welding, seam sealing, and chassis assembly. Controlling a 200 kg welding gun at speeds exceeding 2 m/s requires high-gain servo control. "
        "Engineers utilize second-order Laplace transfer functions to eliminate structural vibrations that could cause weld misalignment."
    )
    add_image_centered('report_assets/industry_automotive.jpg', width_in=5.0)
    add_caption("Figure 9.1: Automated 6-Axis Spot Welding Robotic Cell in Automotive Body Assembly Line.")

    add_subheading("2. Medical & Surgical Robotics (Minimally Invasive Surgery)")
    add_body(
        "Surgical systems like the da Vinci robotic platform translate surgeon master-console movements into microscopic slave-arm motions "
        "inside the patient. Laplace transform transfer functions model low-pass tremor cancellation filters and tele-operation communication delays, "
        "guaranteeing absolute positional accuracy and haptic safety."
    )
    add_image_centered('report_assets/industry_medical.jpg', width_in=5.0)
    add_caption("Figure 9.2: Da Vinci Multi-Arm Precision Surgical Robot in Minimally Invasive Laparoscopy.")

    add_subheading("3. Industrial Pick-and-Place & Packaging")
    add_body(
        "High-speed SCARA and Delta robots package electronics and pharmaceuticals at rates exceeding 150 cycles per minute. Fast transient "
        "response without overshoot—achieved through critically damped Laplace pole placement—prevents delicate component damage."
    )
    add_image_centered('report_assets/industry_assembly.jpg', width_in=5.0)
    add_caption("Figure 9.3: High-Speed Industrial SCARA Manipulator for Automated Component Assembly.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 12: 10. APPLICATION OF LAPLACE TRANSFORM IN ROBOTIC ARM MOVEMENT
    # =========================================================================
    add_heading("10. Application of Laplace Transform in Robotic Arm Movement")
    add_subheading("Dynamic Derivation of Robotic Joint Motor Transfer Function:")
    add_body(
        "Fundamental Modeling Assumptions:\n"
        "1. Simplified Single-Joint Model: The robotic manipulator is modeled as a rigid single link of effective moment of inertia J rotating about a fixed revolute axis.\n"
        "2. Zero Initial Conditions: The joint starts from rest with zero initial storage: i_a(0) = 0, θ(0) = 0, and θ'(0) = 0.\n"
        "3. Linear Governing Equations: Electrical and mechanical subsystems obey linear ordinary differential equations, neglecting magnetic saturation and gearbox backlash."
    )
    add_body("The governing electrical armature loop and rotational mechanical equations in the time domain are:")

    add_equation("v_a(t) = R_a i_a(t) + L_a (di_a/dt) + e_b(t),    e_b(t) = K_b · (dθ/dt)\nJ (d²θ/dt²) + B (dθ/dt) = τ_m(t) = K_t · i_a(t)")

    add_body("Applying the unilateral Laplace transform with zero initial conditions yields the algebraic domain equations:")
    add_equation("V_a(s) = (R_a + L_a s) I_a(s) + K_b s Θ(s),    (J s² + B s) Θ(s) = K_t I_a(s)")

    add_body("Substituting I_a(s) = (J s² + B s) Θ(s) / K_t into the electrical equation produces the fundamental open-loop transfer function:")
    add_equation("G(s) = Θ(s) / V_a(s) = K_t / [ s · { (L_a s + R_a)(J s + B) + K_t K_b } ]    --- (Eq. 10.1)")

    add_image_centered('report_assets/diagram_motor_block.png', width_in=5.2)
    add_caption("Figure 10.1: Mathematical Block Diagram of Robotic Joint DC Servomotor in Laplace Domain.")

    add_subheading("Transient Step Response & Damping Analysis:")
    add_body("Neglecting small motor inductance (L_a ≈ 0), the closed-loop system behaves as a canonical second-order system: Θ(s)/Θ_d(s) = ω_n² / (s² + 2ζω_n s + ω_n²) --- (Eq. 10.2). The damping ratio ζ determines behavior:")

    add_image_centered('report_assets/diagram_step_response.png', width_in=5.2)
    add_caption("Figure 10.2: Joint Angular Transient Response θ(t) Under Varying Damping Conditions.")

    add_bullet("Underdamped (ζ < 1):", "Rapid movement but excessive overshoot (M_p) causing mechanical collisions.")
    add_bullet("Critically Damped (ζ = 1):", "Ideal robotic trajectory—fastest possible convergence to target angle with zero overshoot.")
    add_bullet("Overdamped (ζ > 1):", "Sluggish motion causing delayed cycle times and poor servo bandwidth.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 13: 11. CONCLUSION
    # =========================================================================
    add_heading("11. Conclusion")
    add_body(
        "The mathematical investigation presented in this report establishes the indispensable role of the Laplace Transform in "
        "analyzing, modeling, and controlling modern robotic arm movement. What initially presents itself as a complex mechanical problem—comprising "
        "multi-axis coupled joints, non-linear inertial variations, rotational torque dynamics, and electrical actuator delays—is systematically "
        "reduced to solvable, rigorous engineering formulations through operational mathematics."
    )

    add_body(
        "By mapping continuous-time differential equations into the complex frequency s-domain, the Laplace Transform eliminates the "
        "intricacies of time-domain convolution integrals and higher-order calculus. It provides an intuitive, modular framework where "
        "motor armature circuits, mechanical rotor inertia, gear trains, and sensory feedback loops are represented as interconnected transfer "
        "function blocks. This modularity allows engineers to examine individual subsystem contributions and synthesize comprehensive closed-loop "
        "systems with predictable performance."
    )

    add_body(
        "Furthermore, s-plane pole-zero analysis and partial fraction decomposition grant control engineers direct analytical authority over "
        "transient trajectory dynamics. By evaluating the damping ratio ζ and undamped natural frequency ω_n, engineers "
        "can tune joint controllers to achieve a critically damped state (ζ = 1.0). This guarantees rapid target positioning while "
        "completely eradicating overshoot and oscillatory resonance, which are fatal to high-precision tasks such as surgical incisions or "
        "microelectronic pick-and-place packaging."
    )

    add_body(
        "In modern multi-axis controllers, non-linear cross-coupling terms (such as Coriolis and centrifugal forces) are decoupled through "
        "computed torque control, establishing an inner linearized dynamic loop. Each independent joint axis is then seamlessly stabilized "
        "using classical Laplace-domain PID compensators. These analog transfer functions are subsequently discretized via bilinear transformations "
        "for real-time execution in embedded digital signal processors (DSPs) operating at multi-kilohertz frequencies."
    )

    add_body(
        "Across the real-world manufacturing sectors examined—including automotive spot welding, aerospace carbon-fiber placement, and minimally "
        "invasive medical manipulation—theoretical Laplace models directly translate into digital DSP algorithms executed millions of times per second. "
        "Ultimately, the Laplace Transform is not merely an abstract mathematical tool, but the operational foundation enabling modern "
        "autonomous robotic manipulators to achieve the speed, repeatability, and micro-metric precision demanded by 21st-century industry."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 14: 12. SUMMARY
    # =========================================================================
    add_heading("12. Summary")
    add_body(
        "This Engineering Mathematics III technical report delivers a thorough mathematical and practical analysis of robotic arm movement "
        "grounded in the principles of the Laplace Transform. Beginning with foundational kinematics, the report explores how physical links, "
        "revolute joints, and end-effector tools are represented mathematically through vector summation, coordinate frame transformations, "
        "and forward/inverse kinematic equations. The study demonstrates that while geometry determines static spatial positioning, dynamic "
        "motion requires continuous torque-inertia-damping differential modeling."
    )

    add_body(
        "The core mathematical framework centers on the unilateral Laplace transform: F(s) = ∫₀^∞ e^(-st) f(t) dt. Essential operational "
        "theorems—including linearity, frequency shifting, time delay, derivative properties (L{f'} = sF - f(0), L{f''} = s²F - sf(0) - f'(0)), "
        "and integration—were systematically applied to electro-mechanical motor equations. A step-by-step solved example demonstrated the exact "
        "decomposition of high-order joint velocity functions into partial fractions, highlighting how asymptotic steady-state velocities are reached from rest."
    )

    add_body(
        "A comprehensive Core Mathematical Concepts and Applications Matrix codified eight key mathematical foundations against their robotic "
        "practical implementations, from transfer function derivation to transport delay compensation. Industrial case studies in automotive "
        "welding, surgical robotics, and high-speed electronics assembly confirmed that analytical s-domain pole placement directly prevents "
        "mechanical overshoot and guarantees structural stability under heavy payloads."
    )

    add_body(
        "The investigation underscores that the integration of classical operational calculus with contemporary mechatronics is vital for "
        "mastering complex multi-body dynamical systems. By mastering both the theoretical derivation of transfer functions and their physical "
        "transient response implications, engineers can bridge the gap between abstract mathematical theorems and tangible high-performance robotic machinery."
    )

    add_body(
        "In synthesis, the report verifies that Laplace transform methods bridge the critical divide between abstract calculus and real-world "
        "mechatronics engineering, equipping future engineers with the analytical competencies needed to design, simulate, and deploy "
        "next-generation autonomous robotic manipulators across tomorrow's smart industrial ecosystems."
    )

    doc.save(filename)
    print(f"DOCX build completed: {filename}")

if __name__ == '__main__':
    build_docx()
