import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

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

def build_docx(filename="Engineering_Mathematics_III_Report_Computer_Network_Laplace.docx"):
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
        hrun = hp.add_run("ZEAL COLLEGE OF ENGINEERING & RESEARCH | DEPARTMENT OF ELECTRONICS AND COMPUTER ENGINEERING")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8.5)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(85, 85, 85)
        hpPr = hp._p.get_or_add_pPr()
        hpBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="20809D"/></w:pBdr>')
        hpPr.append(hpBdr)

        # Running Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("CIE-2 Activity 3 & 4 • Computer Network Data Transmission | Engineering Mathematics III")
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
        run.font.size = Pt(16.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(16, 54, 110) # Dark Blue #10366E
        add_teal_divider(doc)
        return p

    def add_subheading(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(10.5)
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
        run.font.size = Pt(9.5)
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        r_bold = p.add_run(bold_prefix + " ")
        r_bold.font.name = "Cambria"
        r_bold.font.size = Pt(9.3)
        r_bold.font.bold = True
        r_text = p.add_run(text)
        r_text.font.name = "Cambria"
        r_text.font.size = Pt(9.3)
        return p

    def add_equation(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        run.font.name = "Cambria"
        run.font.size = Pt(9.8)
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
        run.font.size = Pt(8.2)
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

    def add_two_images_row(img1, img2, width1_in, width2_in, caption_text=""):
        tbl = doc.add_table(rows=1, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        for cell in tbl.rows[0].cells:
            tcPr = cell._tc.get_or_add_tcPr()
            tcBorders = parse_xml(f'''
                <w:tcBorders {nsdecls("w")}>
                    <w:top w:val="none"/>
                    <w:left w:val="none"/>
                    <w:bottom w:val="none"/>
                    <w:right w:val="none"/>
                </w:tcBorders>
            ''')
            tcPr.append(tcBorders)

        cell0 = tbl.rows[0].cells[0]
        cell1 = tbl.rows[0].cells[1]
        cell0.width = Inches(width1_in + 0.1)
        cell1.width = Inches(width2_in + 0.1)

        p0 = cell0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        if os.path.exists(img1):
            p0.add_run().add_picture(img1, width=Inches(width1_in))

        p1 = cell1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        if os.path.exists(img2):
            p1.add_run().add_picture(img2, width=Inches(width2_in))

        if caption_text:
            add_caption(caption_text)

    def add_industry_side_by_side(subheading_text, img_path, caption_text, p1_text, p2_role_text):
        add_subheading(subheading_text)
        tbl = doc.add_table(rows=1, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        for cell in tbl.rows[0].cells:
            tcPr = cell._tc.get_or_add_tcPr()
            tcBorders = parse_xml(f'''
                <w:tcBorders {nsdecls("w")}>
                    <w:top w:val="none"/>
                    <w:left w:val="none"/>
                    <w:bottom w:val="none"/>
                    <w:right w:val="none"/>
                </w:tcBorders>
            ''')
            tcPr.append(tcBorders)

        cell0 = tbl.rows[0].cells[0]
        cell1 = tbl.rows[0].cells[1]
        cell0.width = Inches(2.2)
        cell1.width = Inches(4.5)

        # Left cell: image + caption
        p0 = cell0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        if os.path.exists(img_path):
            p0.add_run().add_picture(img_path, width=Inches(2.0))

        p_cap = cell0.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(2)
        r_cap = p_cap.add_run(caption_text)
        r_cap.font.name = "Cambria"
        r_cap.font.size = Pt(7.8)
        r_cap.font.italic = True
        r_cap.font.color.rgb = RGBColor(90, 90, 90)

        # Right cell: technical text + Role of Laplace Transform
        p1 = cell1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p1.paragraph_format.space_before = Pt(1)
        p1.paragraph_format.space_after = Pt(4)
        p1.paragraph_format.line_spacing = 1.15
        r1 = p1.add_run(p1_text)
        r1.font.name = "Cambria"
        r1.font.size = Pt(8.8)

        p2 = cell1.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(2)
        p2.paragraph_format.line_spacing = 1.15
        r_role = p2.add_run("Role of Laplace Transform: ")
        r_role.font.name = "Cambria"
        r_role.font.size = Pt(8.8)
        r_role.font.bold = True
        r2 = p2.add_run(p2_role_text)
        r2.font.name = "Cambria"
        r2.font.size = Pt(8.8)

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(4)
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
    p_act.paragraph_format.space_before = Pt(6)
    p_act.paragraph_format.space_after = Pt(4)
    r = p_act.add_run("CIE-2 Activity 3 & 4")
    r.font.name = "Cambria"
    r.font.size = Pt(13.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    p_rep = doc.add_paragraph()
    p_rep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_rep.paragraph_format.space_after = Pt(5)
    r = p_rep.add_run("A Report On")
    r.font.name = "Cambria"
    r.font.size = Pt(11.5)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(8)
    r = p_title.add_run("APPLICATION OF LAPLACE TRANSFORM\nIN\nCOMPUTER NETWORK DATA TRANSMISSION")
    r.font.name = "Cambria"
    r.font.size = Pt(18.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(16, 54, 110)

    if os.path.exists('report_assets/watermark_cover.png'):
        p_wm = doc.add_paragraph()
        p_wm.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_wm.paragraph_format.space_before = Pt(0)
        p_wm.paragraph_format.space_after = Pt(2)
        p_wm.add_run().add_picture('report_assets/watermark_cover.png', width=Inches(1.7))

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

    # Students Table - EXACT ORDER specified by user: Trisha Moolya FIRST, all equal weight, regular!
    st_table = doc.add_table(rows=6, cols=3)
    st_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    students = [
        ("1.", "EC2151", "Trisha Moolya"),
        ("2.", "EC2149", "Rutvij Kotwal"),
        ("3.", "EC2150", "Piyush Salgude"),
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
    p_guide.paragraph_format.space_after = Pt(14)
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

    toc_table = doc.add_table(rows=len(toc_items), cols=2)
    toc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (title, page_str) in enumerate(toc_items):
        row = toc_table.rows[idx]
        row.cells[0].width = Inches(5.8)
        row.cells[1].width = Inches(0.8)
        
        p0 = row.cells[0].paragraphs[0]
        p0.paragraph_format.space_before = Pt(4.5)
        p0.paragraph_format.space_after = Pt(4.5)
        r0 = p0.add_run(title)
        r0.font.name = "Cambria"
        r0.font.size = Pt(10.2)

        p1 = row.cells[1].paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_before = Pt(4.5)
        p1.paragraph_format.space_after = Pt(4.5)
        r = p1.add_run(page_str)
        r.font.name = "Cambria"
        r.font.size = Pt(10.2)
        r.font.bold = True
        r.font.color.rgb = RGBColor(16, 54, 110)

    doc.add_page_break()

    # =========================================================================
    # PAGE 3: 1. ABSTRACT
    # =========================================================================
    add_heading("1. Abstract")
    add_body(
        "Computer network data transmission forms the physical technological infrastructure supporting global communications, "
        "cloud computing, and industrial automation. While software protocol stacks abstract data as discrete packets and binary bits, "
        "physical transmission media—such as twisted-pair copper cables, coaxial transmission lines, optical silica fibers, and wireless "
        "radio-frequency (RF) channels—can only conduct continuous electromagnetic waves. The Laplace Transform provides the "
        "indispensable mathematical apparatus for transforming intractable continuous-time differential equations of transmission channels "
        "into solvable algebraic expressions in the complex frequency s-domain. Core technical aspects explored in this report include:"
    )

    add_bullet("Physical Channel Modeling:",
               "Representation of distributed transmission line parameters (RLCG components) and lumped filter circuits using operational transfer functions H(s) = V_out(s) / V_in(s).")
    add_bullet("Signal Attenuation & Dispersion Analysis:",
               "Mathematical evaluation of high-frequency attenuation, exponential amplitude decay, and pulse broadening that induce Inter-Symbol Interference (ISI) across band-limited physical links.")
    add_bullet("Transient Response & Rise-Time Formulation:",
               "Investigation of continuous-time voltage and current transients across first-order RC and second-order RLC circuit models, quantifying bit-period timing margins and transmission bandwidth.")
    add_bullet("Continuous-Time Equalization:",
               "Synthesis of analog receive-side line equalizers and low-pass filter networks in the s-domain to reconstruct distorted digital square pulses prior to threshold detection.")

    add_image_centered('report_assets/diagram_net_abstract.png', width_in=5.4)
    add_caption("Figure 1.1: Functional Representation of End-to-End Data Transmission Mapped to Laplace Complex Frequency Domain.")

    add_body(
        "By mapping continuous-time convolution into straightforward algebraic multiplication in the s-plane, the Laplace Transform "
        "enables communications engineers to optimize transceiver equalization, maximize channel capacity, and ensure error-free bit recovery."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 4: 2. INTRODUCTION
    # =========================================================================
    add_heading("2. Introduction")
    add_body(
        "A computer network is an interconnected ensemble of computing nodes exchanging digital information across physical communication channels. "
        "The core functionality rests upon data transmission: the propagation of encoded bitstreams from a sender to a receiver. Modern enterprise "
        "communications integrate wired channels (twisted-pair copper, coaxial lines, optical fiber) and wireless radio links."
    )

    add_body(
        "At the software level, data is abstracted as discrete binary digits ('0's and '1's). However, at the physical layer, transmission media "
        "conduct continuous electromagnetic voltages or optical photons. Every physical link exhibits inherent resistance (R), inductance (L), "
        "capacitance (C), and conductance (G), which attenuate higher harmonics and disperse pulse edges."
    )

    # Side-by-side: Diagram + Network Switch Photo
    add_two_images_row('report_assets/diagram_net_arch.png', 'report_assets/photo_network_switch.png',
                       width1_in=2.7, width2_in=2.7,
                       caption_text="Figure 2.1: Sender-Channel-Receiver Signal Architecture (Left) and Enterprise Rackmount Ethernet Switches & Patch Panels (Right).")

    add_body(
        "Herein lies the profound power of Engineering Mathematics III: the Laplace Transform converts linear differential equations into "
        "algebraic polynomials in the s-domain. By evaluating channel transfer functions H(s), engineers predict pulse rise-times, calculate "
        "spectral bandwidth, and design analog equalizers that eliminate inter-symbol interference."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 5: 3. DEFINITION OF COMPUTER NETWORK DATA TRANSMISSION
    # =========================================================================
    add_heading("3. Definition of Computer Network Data Transmission")
    add_body(
        "Computer network data transmission is formally defined as the physical transfer and propagation of encoded digital bitstreams "
        "over point-to-point or multipoint communication channels via continuous-time electromagnetic or optical signals, subject to the "
        "governing laws of electromagnetism, circuit differential equations, and signal processing constraints."
    )

    add_bullet("Bit Rate (R):", "The transmission speed quantified as the number of bits transferred per unit time: R = N / Δt (bps).")
    add_bullet("Channel Bandwidth (B):", "The range of continuous frequencies passed by the channel with acceptable loss: B = f₂ - f₁ (Hz).")
    add_bullet("Signal Attenuation (Power vs. Voltage Distinction):",
               "Signal attenuation quantifies the logarithmic reduction in signal strength. For signal power, attenuation in decibels is: "
               "A_power (dB) = 10 · log₁₀(P_in / P_out). For signal voltage (under matched input/output impedances Z_in = Z_out), because power is "
               "proportional to voltage squared (P = V² / Z), attenuation is expressed with a factor of 20: A_voltage (dB) = 20 · log₁₀(V_in / V_out).")
    add_bullet("Propagation Delay (t_prop):",
               "The finite time required for a wavefront to travel link distance d: t_prop = d / v_prop, where v_prop ≈ 2 × 10⁸ m/s in copper and optical glass.")
    add_bullet("Transmission Modes:", "Simplex (unidirectional), Half-Duplex (two-way alternate), and Full-Duplex (simultaneous bidirectional).")

    # Side-by-side: Modes diagram + RJ45 Ethernet cable photograph
    add_two_images_row('report_assets/diagram_transmission_modes.png', 'report_assets/photo_ethernet_rj45.png',
                       width1_in=2.7, width2_in=2.7,
                       caption_text="Figure 3.1: Data Transmission Modes (Left) and Authentic Category 6 UTP Ethernet Cable with RJ45 Connector (Right).")

    add_body(
        "Analytical Distinction: The Laplace Transform applies specifically to continuous-time circuit dynamics, cable impulse response, "
        "and transceiver filtering at the physical layer, rather than discrete packet routing protocols."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 6: 4. MATHEMATICAL ANALYSIS
    # =========================================================================
    add_heading("4. Mathematical Analysis")
    add_subheading("Rigorous Derivation of Transmission Line Circuit Model:")
    add_body(
        "Consider a lumped transmission line segment of series resistance R, series inductance L, and shunt capacitance C. "
        "Applying Kirchhoff's Voltage Law (KVL) around the loop:\n"
        "    v_in(t) = v_R(t) + v_L(t) + v_out(t) = R · i(t) + L · (di/dt) + v_out(t)\n"
        "Because the total loop current charges the shunt capacitor, i(t) = C · (dv_out/dt) and di/dt = C · (d²v_out/dt²). Substituting into "
        "the KVL equation yields the governing second-order ordinary differential equation:"
    )

    add_equation("L C · (d²v_out(t) / dt²) + R C · (dv_out(t) / dt) + v_out(t) = v_in(t)      --- (Eq. 4.1)")

    add_body(
        "In standard canonical control form: d²v_out/dt² + (R/L) · (dv_out/dt) + (1/LC) · v_out = (1/LC) · v_in(t), where the undamped natural "
        "frequency is ω_n = 1 / √(LC) and damping ratio is ζ = (R/2) · √(C/L)."
    )

    add_image_centered('report_assets/diagram_signal_waveform.png', width_in=5.2)
    add_caption("Figure 4.1: Pulse Edge Dispersion, Rise-Time Elongation, and Channel Low-Pass Frequency Response.")

    add_subheading("Theoretical Channel Capacity Bounds (Nyquist and Shannon Limits):")
    add_body(
        "It is essential to understand that both the Nyquist and Shannon formulas define theoretical upper bounds, not guaranteed operating speeds:\n"
        "• Nyquist Maximum Bit Rate (Ideal Noiseless Channel Bound):\n"
        "    R_max = 2 · B · log₂(M)   [bps]      --- (Eq. 4.2)\n"
        "This formula represents the absolute theoretical limit for a channel of bandwidth B using M discrete signaling levels without noise. "
        "Practical systems require excess bandwidth factor α > 0 (raised cosine filtering), yielding achievable rates R = 2B / (1 + α) · log₂(M).\n"
        "• Shannon-Hartley Channel Capacity (Maximum Information Bound under Noise):\n"
        "    C = B · log₂(1 + SNR) = B · log₂(1 + P_signal / P_noise)   [bps]      --- (Eq. 4.3)\n"
        "Shannon's theorem proves the fundamental mathematical ceiling on error-free information transmission over an additive white Gaussian "
        "noise (AWGN) channel. Real-world transceivers operate 1–3 dB below this theoretical limit due to finite coding block-lengths and implementation losses."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 7: 5. APPLICATIONS OF MATHEMATICS IN COMPUTER NETWORK TRANSMISSION
    # =========================================================================
    add_heading("5. Applications of Mathematics in Computer Network Data Transmission")
    add_body(
        "Mathematical modeling provides the quantitative foundation for designing network hardware, calculating bandwidth limitations, "
        "and mitigating transmission impairments across physical media."
    )

    add_subheading("1. Channel Bandwidth & Theoretical Nyquist Rate Calculation:")
    add_body(
        "Consider a Category 6 UTP Ethernet cable operating with an effective bandwidth of B = 250 MHz using 4-level pulse amplitude modulation "
        "(PAM-4, where M = 4 levels representing 2 bits/symbol). The theoretical maximum bit rate under ideal noiseless conditions is:\n"
        "    R_max = 2 · B · log₂(M) = 2 · (250 × 10⁶) · log₂(4) = 2 · (250 × 10⁶) · 2 = 1000 Mbps = 1.0 Gbps."
    )

    add_subheading("2. Shannon Theoretical Capacity under Additive Noise:")
    add_body(
        "When operating across a noisy industrial link with signal-to-noise ratio SNR_dB = 30 dB (linear power ratio SNR = 10^(30/10) = 1000):\n"
        "    C = B · log₂(1 + SNR) = (250 × 10⁶) · log₂(1001) ≈ (250 × 10⁶) · 9.967 = 2.492 Gbps.\n"
        "This sets the absolute mathematical ceiling on error-free data throughput across this physical link."
    )

    # Side-by-side: Attenuation curve + Duplex LC optical connector photo
    add_two_images_row('report_assets/diagram_attenuation_bandwidth.png', 'report_assets/photo_optical_lc.png',
                       width1_in=2.7, width2_in=2.7,
                       caption_text="Figure 5.1: Attenuation vs. Distance & Shannon Frontier (Left) and Precision Duplex LC Optical Fiber Connectors (Right).")

    add_subheading("3. Signal Attenuation & Propagation Delay Formulation:")
    add_body(
        "Electromagnetic signal power decays exponentially: P(x) = P₀ · e^(-α x), where α is the attenuation coefficient in Np/m. "
        "For a 100 m Cat6 UTP channel with velocity v = 2.0 × 10⁸ m/s:\n"
        "    t_prop = d / v = 100 / (2.0 × 10⁸) = 5.0 × 10^(-7) s = 500 ns.\n"
        "This transmission delay is modeled algebraically in the Laplace s-domain using the Second Shifting Property: "
        "L{v(t - t_prop) · u(t - t_prop)} = e^(-s · t_prop) · V(s)."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 8: 6. DEFINITION AND PROPERTIES OF LAPLACE TRANSFORM
    # =========================================================================
    add_heading("6. Definition and Properties of Laplace Transform")
    add_body(
        "Mathematical Definition: Let f(t) be a continuous or piecewise continuous time-domain function defined for t ≥ 0. The unilateral "
        "Laplace Transform of f(t), denoted as L{f(t)} or F(s), is defined by the improper integral:"
    )
    add_equation("L{f(t)} = F(s) = ∫₀^∞ e^(-st) · f(t) dt      --- (Eq. 6.1)")
    add_body(
        "where s = σ + jω is the complex frequency variable (rad/s), σ is the attenuation factor, ω is angular frequency, and j = √(-1). "
        "The integral converges in the Region of Convergence (ROC) where Re(s) > σ₀."
    )

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

    add_image_centered('report_assets/diagram_laplace_network.png', width_in=5.2)
    add_caption("Figure 6.1: Conceptual Mapping between Continuous-Time Line Dynamics and Complex Frequency s-Domain.")

    add_subheading("Fundamental Operational Properties:")
    add_body(
        "1. Linearity: L{a f(t) + b g(t)} = a F(s) + b G(s) for arbitrary constants a, b.\n"
        "2. First Shifting Theorem: L{e^(at) f(t)} = F(s - a) (models exponential signal attenuation and damped ringing).\n"
        "3. Second Shifting Theorem: L{f(t - a) · u(t - a)} = e^(-as) · F(s) (models propagation delay along transmission cables).\n"
        "4. First Derivative: L{df/dt} = s F(s) - f(0)  |  Second Derivative: L{d²f/dt²} = s² F(s) - s f(0) - f'(0).\n"
        "5. Integration Property: L{∫₀ᵗ f(τ) dτ} = (1/s) F(s) (models capacitor charge accumulation in transmission lines)."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 9: 7. INVERSE LAPLACE TRANSFORM
    # =========================================================================
    add_heading("7. Inverse Laplace Transform")
    add_body(
        "Definition: The Inverse Laplace Transform reconstructs the continuous time-domain signal f(t) from its algebraic "
        "complex frequency representation F(s): f(t) = L⁻¹{F(s)}. Rational transfer functions F(s) = P(s)/Q(s) are evaluated via "
        "Partial Fraction Decomposition:"
    )

    add_subheading("Solved Example 1: Partial Fraction Evaluation of Network Line Voltage Step Response")
    add_body(
        "A band-limited transmission channel has an output voltage transform: V(s) = 10 / [ s (s + 5) ]. Determine v(t).\n"
        "Step 1: Partial Fraction Expansion: 10 / [ s (s + 5) ] = A / s + B / (s + 5)\n"
        "• Residue A = [ 10 / (s + 5) ]_(s = 0) = 10 / 5 = 2\n"
        "• Residue B = [ 10 / s ]_(s = -5) = 10 / (-5) = -2\n"
        "Step 2: Inverse Transform: v(t) = L⁻¹{ 2 / s - 2 / (s + 5) } = [ 2 - 2 e^(-5t) ] · u(t) = 2 (1 - e^(-5t)) · u(t) V.\n"
        "Physical Conclusion: At t = 0, v(0) = 0 V. As t → ∞, v(∞) = 2.0 V. The line charges to 90% in 0.46 s."
    )

    add_subheading("Solved Example 2: Second-Order Resonant Ringing with Quadratic Denominator")
    add_body(
        "An underdamped RLC cable termination has an output transform: V(s) = 29 / [ s (s² + 4s + 29) ]. Determine v(t).\n"
        "Step 1: Completing the Square in Quadratic Term:\n"
        "    s² + 4s + 29 = (s + 2)² + 25 = (s + 2)² + 5²  (damping α = 2, damped frequency ω_d = 5 rad/s).\n"
        "Step 2: Partial Fraction Expansion:\n"
        "    29 / [ s ((s + 2)² + 25) ] = A / s + (B s + D) / [ (s + 2)² + 25 ]\n"
        "Multiplying by s(s² + 4s + 29): 29 = A(s² + 4s + 29) + (Bs + D)s = (A + B)s² + (4A + D)s + 29A.\n"
        "• Constant term: 29 A = 29 ⇒ A = 1.\n"
        "• Coefficient of s²: A + B = 0 ⇒ B = -A = -1.\n"
        "• Coefficient of s: 4A + D = 0 ⇒ 4(1) + D = 0 ⇒ D = -4.\n"
        "Rewriting the quadratic numerator in standard shifting form:\n"
        "    - (s + 4) / [ (s + 2)² + 5² ] = - (s + 2) / [ (s + 2)² + 5² ] - (2/5) · 5 / [ (s + 2)² + 5² ]\n"
        "Step 3: Exact Inverse Laplace Transform via First Shifting Property:\n"
        "    v(t) = L⁻¹{ 1/s - (s + 2)/((s + 2)² + 5²) - (2/5) · 5/((s + 2)² + 5²) }\n"
        "    v(t) = [ 1 − e^(-2t) cos(5t) − (2/5) e^(-2t) sin(5t) ] · u(t) V      (for t ≥ 0).\n"
        "Physical Conclusion: At t = 0, v(0) = 1 - 1 = 0 V. Damped ringing at 5 rad/s settles exponentially within 4/α = 2 s to v(∞) = 1.0 V."
    )

    add_image_centered('report_assets/diagram_inverse_laplace.png', width_in=5.2)
    add_caption("Figure 7.1: Systematic Residue Evaluation and Partial Fraction Decomposition Workflow.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 10: 8. APPLICATION OF DIFFERENTIAL EQUATIONS BY LAPLACE TRANSFORM
    # =========================================================================
    add_heading("8. Application of Differential Equations by Laplace Transform")
    add_body(
        "Analytical Framework: The Laplace Transform solves differential equations with initial values y(0) and y'(0) directly incorporated "
        "during transformation, converting the differential equation into an algebraic equation in Y(s)."
    )

    add_subheading("Solved Example 1: First-Order Transmission Line Charging Equation with Initial Voltage")
    add_body(
        "Solve the receiver line charging differential equation: dv/dt + 4 v(t) = 12 u(t), subject to initial condition v(0) = 1.0 V.\n"
        "Step 1: Apply Laplace Transform: [ s V(s) - v(0) ] + 4 V(s) = 12 / s\n"
        "Step 2: Insert Initial Condition v(0) = 1.0: (s + 4) V(s) - 1 = 12 / s ⇒ (s + 4) V(s) = (s + 12) / s\n"
        "Step 3: Partial Fractions: V(s) = (s + 12) / [ s (s + 4) ] = A / s + B / (s + 4)\n"
        "• Residue A = [ (s + 12) / (s + 4) ]_(s = 0) = 12 / 4 = 3\n"
        "• Residue B = [ (s + 12) / s ]_(s = -4) = 8 / (-4) = -2\n"
        "Step 4: Take Inverse Transform: v(t) = L⁻¹{ 3 / s - 2 / (s + 4) } = (3 - 2 e^(-4t)) · u(t) V.\n"
        "Verification: At t = 0, v(0) = 3 - 2 = 1.0 V. Derivative v'(0) = 8 ⇒ 8 + 4(1) = 12. Exact!"
    )

    add_subheading("Solved Example 2: Second-Order RLC Communication Cable Resonant Equation")
    add_body(
        "Solve the second-order line current equation: d²i/dt² + 6 (di/dt) + 8 i(t) = 0, with initial values i(0) = 2.0 A, i'(0) = 0.\n"
        "Step 1: Apply Laplace Transform: [ s² I(s) - s i(0) - i'(0) ] + 6 [ s I(s) - i(0) ] + 8 I(s) = 0\n"
        "Step 2: Insert Initial Conditions i(0) = 2.0, i'(0) = 0:\n"
        "    s² I(s) - 2s - 0 + 6 s I(s) - 12 + 8 I(s) = 0 ⇒ (s² + 6s + 8) I(s) = 2s + 12\n"
        "Step 3: Solve for I(s) and Factor Denominator: I(s) = (2s + 12) / [ (s + 2)(s + 4) ] = A / (s + 2) + B / (s + 4)\n"
        "• Residue A = [ (2s + 12) / (s + 4) ]_(s = -2) = (-4 + 12) / (-2 + 4) = 8 / 2 = 4\n"
        "• Residue B = [ (2s + 12) / (s + 2) ]_(s = -4) = (-8 + 12) / (-4 + 2) = 4 / (-2) = -2\n"
        "Step 4: Inverse Transform to Obtain Time Response:\n"
        "    i(t) = L⁻¹{ 4 / (s + 2) - 2 / (s + 4) } = (4 e^(-2t) - 2 e^(-4t)) · u(t) A.\n"
        "Verification: At t = 0, i(0) = 4 - 2 = 2.0 A. Derivative i'(t) = -8 e^(-2t) + 8 e^(-4t) ⇒ i'(0) = 0. Verified!"
    )

    add_image_centered('report_assets/diagram_diff_eq_flowchart.png', width_in=5.2)
    add_caption("Figure 8.1: Complete Methodological Flowchart for Solving Differential Equations Using Laplace Transform.")
    doc.add_page_break()

    # =========================================================================
    # PAGE 11: 9. REAL-LIFE INDUSTRY EXPOSURE
    # =========================================================================
    add_heading("9. Real-Life Industry Exposure", align=WD_ALIGN_PARAGRAPH.LEFT)
    add_body(
        "Laplace transform techniques and differential equation modeling form the core operational basis of global telecommunication systems, "
        "data center infrastructures, high-speed optical backbones, and wireless cellular standards."
    )

    add_industry_side_by_side(
        "9.1 Enterprise Ethernet & Cloud Data Center Switching Fabrics (10G/40G/100GBASE-T)",
        'report_assets/photo_server_rack_sq.png',
        "Figure 9.1: Enterprise Server Racks and Ethernet Patch Switching Infrastructure.",
        "Modern hyperscale cloud data centers deploy dense racks of high-speed top-of-rack switches interconnected via Category 6A/8 copper cabling. "
        "At signaling frequencies exceeding 500 MHz, distributed skin-effect resistance and dielectric losses severely attenuate higher harmonics, "
        "distorting multi-level PAM pulses.",
        "Hardware transceiver designers model channel frequency roll-off in the Laplace s-domain to synthesize Continuous-Time Linear Equalizers (CTLE). "
        "By placing equalizer transfer-function zeros to cancel cable poles, the receive circuitry restores pulse rise-times and eliminates "
        "inter-symbol interference prior to digital slicing."
    )

    add_industry_side_by_side(
        "9.2 Long-Haul DWDM Optical Fiber Backbones & Subsea Links",
        'report_assets/photo_fiber_cable_sq.png',
        "Figure 9.2: Silica Optical Fiber Transporting High-Speed Photonic Bitstreams.",
        "Intercontinental subsea cables span thousands of kilometers carrying dense wavelength-division multiplexed (DWDM) optical bitstreams. "
        "At the optical receiver, high-speed PIN or APD photodiodes convert microscopic light pulses into photocurrents that require instantaneous "
        "amplification by Transimpedance Amplifiers (TIA).",
        "Second-order Laplace transfer functions H(s) govern the closed-loop TIA frequency response. Communications engineers optimize pole-zero "
        "locations in the s-plane to establish a damping ratio ζ ≈ 0.707 to 1.0, achieving maximum transimpedance gain and bandwidth while "
        "preventing resonant ringing and bit decision errors."
    )

    add_industry_side_by_side(
        "9.3 5G / 6G Wireless Cellular Infrastructure & Base Stations",
        'report_assets/photo_wireless_tower_sq.png',
        "Figure 9.3: 5G Massive MIMO Antenna Tower Supporting Gigabit Wireless Channels.",
        "In 5G Massive MIMO cellular towers, base station RF transceiver arrays transmit multi-gigabit data streams across time-varying multi-path channels. "
        "Carrier synchronization and phase modulation require agile local oscillators that continuously track dynamic Doppler frequency shifts and mobile phase drift.",
        "Phase-Locked Loops (PLLs) are synthesized entirely in the complex frequency s-domain. The loop filter transfer function F(s) is formulated "
        "to set the closed-loop natural frequency ω_n and damping ratio ζ = 1.0 (critically damped), suppressing phase jitter and guaranteeing rapid carrier locking."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 12: 10. APPLICATION OF LAPLACE TRANSFORM IN NETWORK TRANSMISSION
    # =========================================================================
    add_heading("10. Application of Laplace Transform in Computer Network Data Transmission")
    add_subheading("Mathematical Derivation of RC Low-Pass Physical Channel Transfer Function:")
    add_body(
        "A physical transmission cable exhibits series resistance R and shunt capacitance C. Under zero initial conditions (v_out(0) = 0), "
        "the governing KVL equation is RC · (dv_out/dt) + v_out(t) = v_in(t). Taking the unilateral Laplace transform yields the transfer function:\n"
        "    (s R C + 1) V_out(s) = V_in(s) ⇒ H(s) = V_out(s) / V_in(s) = 1 / (1 + s R C) = (1/τ) / (s + 1/τ)      --- (Eq. 10.1)"
    )

    # Side-by-side: RC low-pass circuit diagram + Oscilloscope photo
    add_two_images_row('report_assets/diagram_rc_lowpass.png', 'report_assets/photo_oscilloscope.png',
                       width1_in=2.7, width2_in=2.7,
                       caption_text="Figure 10.1: RC Low-Pass Channel Model (Left) and Digital Storage Oscilloscope Measuring Actual Pulse Waveforms (Right).")

    add_subheading("Transient Step Response & Rise-Time Formulation:")
    add_body(
        "For an incoming digital bit modeled as a unit step V_in(s) = V₀ / s:\n"
        "    V_out(s) = V₀ / [ s (1 + s R C) ] = V₀ [ 1/s - 1 / (s + 1/RC) ] ⇒ v_out(t) = V₀ (1 - e^(-t/RC)) · u(t).\n"
        "The 10%-to-90% rise-time is: t_r = RC · ln(0.9 / 0.1) ≈ 2.2 R C = 2.2 τ = 0.35 / f_c, directly limiting transmission bit rate."
    )

    add_image_centered('report_assets/diagram_rlc_step_response.png', width_in=5.0)
    add_caption("Figure 10.2: RLC Channel Transient Step Response under Underdamped, Critically Damped, and Overdamped Conditions.")

    add_bullet("Underdamped (ζ < 1):", "Inadequate damping causes high-frequency ringing and false logic threshold triggering.")
    add_bullet("Critically Damped (ζ = 1):", "Optimal line termination—fastest pulse rise-time with zero overshoot and zero ringing.")
    add_bullet("Overdamped (ζ > 1):", "Excessive capacitive loading causes sluggish edges and severe inter-symbol interference (ISI).")
    doc.add_page_break()

    # =========================================================================
    # PAGE 13: 11. CONCLUSION
    # =========================================================================
    add_heading("11. Conclusion")
    add_body(
        "The mathematical investigation presented in this technical report establishes the foundational and indispensable role of the "
        "Laplace Transform in analyzing, modeling, and optimizing modern Computer Network Data Transmission. Although computer "
        "networking is often perceived through the lens of abstract software architectures, protocol stacks, and discrete packets, all digital data "
        "must ultimately propagate as continuous electromagnetic waveforms through physical media. Operational mathematics provides the bridge "
        "between physical circuit phenomena and dependable digital communications."
    )

    add_body(
        "By transforming time-domain ordinary differential equations into the complex frequency s-domain, the Laplace Transform eliminates "
        "the formidable mathematical complexity of convolution integrals and higher-order calculus. It provides an intuitive, modular transfer-function "
        "framework where transmission cables, transceiver amplifiers, terminating impedances, and noise filters are modeled as interconnected algebraic "
        "blocks. This operational calculus enables engineers to compute exact transient step responses, analyze pole-zero s-plane stability, and "
        "predict high-frequency signal attenuation with mathematical precision."
    )

    add_body(
        "Furthermore, the application of operational theorems—specifically the First Shifting Theorem (modeling exponential attenuation and "
        "damped resonance) and the Second Shifting Theorem (modeling cable transport delay e^(-as))—provides exact analytical expressions "
        "for pulse distortion. By evaluating the damping ratio ζ in second-order RLC channel models, hardware engineers can design line "
        "terminations that achieve the critically damped state (ζ = 1.0), ensuring the fastest possible pulse rise-time while completely "
        "eradicating signal overshoot and false logic triggering."
    )

    add_body(
        "Across the telecommunications sectors examined—including enterprise 10G/40G Ethernet networks, transoceanic fiber-optic links, and 5G/6G "
        "massive MIMO cellular systems—theoretical Laplace models directly govern the design of continuous-time linear equalizers (CTLE) and "
        "phase-locked loops (PLL) integrated into modern PHY-layer transceiver silicon. These circuits operate continuously to counteract physical "
        "channel degradation and guarantee error-free bit recovery."
    )

    add_body(
        "Ultimately, the Laplace Transform is not merely an abstract topic in Engineering Mathematics III, but an indispensable engineering methodology "
        "that empowers electronics and computer engineers to master physical-layer signal integrity and expand the capacity frontiers of next-generation "
        "global computer networks."
    )
    doc.add_page_break()

    # =========================================================================
    # PAGE 14: 12. SUMMARY
    # =========================================================================
    add_heading("12. Summary")
    add_body(
        "This Engineering Mathematics III technical report delivers a rigorous mathematical and physical analysis of computer network data "
        "transmission centered on the operational principles of the Laplace Transform. Beginning with physical-layer fundamentals, the report "
        "examined how discrete digital bitstreams are encoded into continuous-time electromagnetic signals and transmitted over copper, optical fiber, "
        "and wireless channels. Fundamental parameters—including bit rate, channel bandwidth, signal attenuation, propagation delay, and noise—were "
        "quantitatively defined and linked to governing differential equations."
    )

    add_body(
        "The mathematical foundation adhered strictly to the prescribed Second Year syllabus: (1) Definition and properties of the unilateral "
        "Laplace transform F(s) = ∫₀^∞ e^(-st) f(t) dt, covering linearity, frequency shifting, time shifting, differentiation, and integration; "
        "(2) Inverse Laplace Transform techniques utilizing partial fraction decomposition across linear and quadratic irreducible factors; and "
        "(3) The direct solution of first-order and second-order linear differential equations with non-zero initial conditions."
    )

    add_body(
        "Step-by-step solved mathematical examples demonstrated the exact analytical determination of line voltage transients, partial fraction residues, "
        "and second-order damped sinusoidal oscillations. In parallel, classical communications theorems—including the Nyquist Maximum Bit Rate formula "
        "R = 2B log₂(M) and the Shannon-Hartley Channel Capacity theorem C = B log₂(1 + SNR)—were evaluated to demonstrate how physical "
        "channel bandwidth and thermal noise impose definitive mathematical bounds on achievable network throughput."
    )

    add_body(
        "Real-world industrial case studies in high-speed enterprise Ethernet, long-haul DWDM optical fiber transceivers, and 5G cellular RF architectures "
        "confirmed that Laplace-domain transfer functions directly underpin the design of high-speed equalizers, transimpedance amplifiers, and "
        "carrier synchronization loops deployed across modern network equipment."
    )

    add_body(
        "In synthesis, the report confirms that Laplace transform calculus bridges the critical interface between abstract operational mathematics "
        "and practical telecommunications engineering, providing undergraduate engineering students with the analytical competencies required to "
        "design, analyze, and optimize tomorrow's high-speed computer network infrastructures."
    )

    doc.save(filename)
    print(f"DOCX build completed: {filename}")

if __name__ == '__main__':
    build_docx()
