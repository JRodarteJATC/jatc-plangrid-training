/* In-app quizzes, worksheets and the written final.
   Only the QUESTIONS are here. The answer key lives in the private
   jatc-plangrid-instructor-keys repo (grading-key.json) and is loaded into the
   Instructor Dashboard, so apprentices can't read the answers in this code.

   Question types:
     mc    – pick one           (options)
     multi – pick all that apply (options)
     num   – number             (unit)
     text  – short answer (auto-graded by keywords, instructor can override)   */
PT.quizzes = (() => {
  const { esc, $, $$, toast, fmtDateTime } = PT.util;
  const store = PT.store;
  const TF = ["True", "False"];
  const IPR = ["Issue", "Punch item", "RFI"];

  const SETS = [
    {
      "id": "quiz1",
      "kind": "Quiz",
      "title": "Quiz 1 – Getting Started & Navigating Sheets",
      "module": 1,
      "questions": [
        {
          "id": "1",
          "type": "mc",
          "q": "Main reason roofing contractors use plan apps instead of only paper sets?",
          "options": [
            "OSHA requires it",
            "Drawings print bigger",
            "Everyone works from the same current set and sees changes right away",
            "It replaces the specifications"
          ]
        },
        {
          "id": "2",
          "type": "mc",
          "q": "The prefix W on sheet W-101 most likely means:",
          "options": [
            "Wall",
            "Waterproofing",
            "West",
            "Window"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "A bubble reads 2 / R-501. It means:",
          "options": [
            "Revision 2 of R-501",
            "Detail 2, drawn on sheet R-501",
            "Sheet 2 of 501",
            "2 drains shown on R-501"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "True or false: if two versions of a sheet exist, build from whichever opens first.",
          "options": [
            "True",
            "False"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "Where do you confirm a sheet's revision number and date?",
          "options": [
            "Title block revision list",
            "North arrow",
            "Drawing scale",
            "Keyed notes"
          ]
        },
        {
          "id": "6",
          "type": "mc",
          "q": "Which sheet explains a symbol you don't recognize?",
          "options": [
            "W-501 Details",
            "R-601 Schedules",
            "R-001 Symbols, notes & sheet index",
            "R-102 Tapered plan"
          ]
        },
        {
          "id": "7",
          "type": "mc",
          "q": "Before going up on a roof with no signal you should:",
          "options": [
            "Print every sheet",
            "Turn the tablet off",
            "Nothing – it always works",
            "Download / sync sheets for offline use"
          ]
        },
        {
          "id": "8",
          "type": "multi",
          "q": "The top search bar can find (select all):",
          "options": [
            "Payroll",
            "Documents / specs",
            "Issues",
            "RFIs",
            "Tomorrow's weather",
            "Photos"
          ]
        }
      ]
    },
    {
      "id": "quiz2",
      "kind": "Quiz",
      "title": "Quiz 2 – Markups & Layers",
      "module": 2,
      "questions": [
        {
          "id": "1",
          "type": "mc",
          "q": "Which layer is visible only to you?",
          "options": [
            "Published",
            "Personal",
            "As-Built"
          ]
        },
        {
          "id": "2",
          "type": "mc",
          "q": "Standard way to show a changed area on a drawing:",
          "options": [
            "Hyperlink",
            "Stamp",
            "Highlighter",
            "Revision cloud"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "A pipe boot was relocated with approval. Which layer records it for the owner?",
          "options": [
            "Personal",
            "Published",
            "As-Built"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "True or false: it's always fine to delete a published markup because it's yours.",
          "options": [
            "True",
            "False"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "Why keep takeoff marks on the Personal layer?",
          "options": [
            "Makes measurements more accurate",
            "Personal markups print bigger",
            "Keeps scratch work off the team's view",
            "Published markups can't be measured"
          ]
        },
        {
          "id": "6",
          "type": "mc",
          "q": "Almost every shape markup should be paired with:",
          "options": [
            "A stamp",
            "A photo of yourself",
            "A text note explaining what and why",
            "Nothing"
          ]
        },
        {
          "id": "7",
          "type": "mc",
          "q": "Keyboard shortcut to undo:",
          "options": [
            "Ctrl+Z",
            "Delete",
            "Ctrl+P",
            "Esc"
          ]
        },
        {
          "id": "8",
          "type": "multi",
          "q": "Stamps that make sense on a roofing job (select all):",
          "options": [
            "PAID IN FULL",
            "SEE RFI",
            "APPROVED BY OSHA",
            "FIELD VERIFY",
            "LEAK",
            "PROBED OK"
          ]
        }
      ]
    },
    {
      "id": "quiz3",
      "kind": "Quiz",
      "title": "Quiz 3 – Measure, Count & Takeoff",
      "module": 3,
      "questions": [
        {
          "id": "1",
          "type": "num",
          "q": "How many square feet in one roofing square?",
          "unit": "SF"
        },
        {
          "id": "2",
          "type": "mc",
          "q": "Why must an uploaded PDF be calibrated before measuring?",
          "options": [
            "It doesn't need to be",
            "To make it load faster",
            "The app doesn't know the printed scale of the PDF",
            "To unlock markups"
          ]
        },
        {
          "id": "3",
          "type": "multi",
          "q": "Which sheets should you NOT measure on? (select all)",
          "options": [
            "R-001 Symbols & notes",
            "R-601 Schedules",
            "R-101 Roof plan",
            "W-101 Below-grade plan",
            "R-102 Tapered plan"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "A 1/4\" = 1'-0\" roof plan printed half-size on 11×17 is actually:",
          "options": [
            "1/4\" = 1'-0\"",
            "1/2\" = 1'-0\"",
            "1/8\" = 1'-0\"",
            "1\" = 1'-0\""
          ]
        },
        {
          "id": "5",
          "type": "num",
          "q": "Roof Area A is 60' × 64'. How many SF?",
          "unit": "SF"
        },
        {
          "id": "6",
          "type": "num",
          "q": "How many squares is Roof Area A?",
          "unit": "squares"
        },
        {
          "id": "7",
          "type": "num",
          "q": "With 10% waste, how many 10' × 100' TPO rolls does Area A need?",
          "unit": "rolls"
        },
        {
          "id": "8",
          "type": "num",
          "q": "Basement 60' × 40' with 12' walls: SF of wall waterproofing before waste?",
          "unit": "SF"
        },
        {
          "id": "9",
          "type": "mc",
          "q": "Why round rolls and boards UP?",
          "options": [
            "You don't – always round down",
            "It lowers the price",
            "Suppliers require it",
            "Running short stops the crew – you can't buy part of a roll"
          ]
        },
        {
          "id": "10",
          "type": "mc",
          "q": "Tool that totals pipe penetrations on a roof plan:",
          "options": [
            "Stamp",
            "Calibrate",
            "Area",
            "Count"
          ]
        }
      ]
    },
    {
      "id": "quiz4",
      "kind": "Quiz",
      "title": "Quiz 4 – Issues & Punch Lists",
      "module": 4,
      "questions": [
        {
          "id": "1",
          "type": "mc",
          "q": "\"Unwelded seam at RTU-1 curb corner\" is a(n):",
          "options": [
            "Issue",
            "Punch item",
            "RFI"
          ]
        },
        {
          "id": "2",
          "type": "mc",
          "q": "\"Detail says 8\" flashing but the curb is only 6\" above the roof\" is a(n):",
          "options": [
            "Issue",
            "Punch item",
            "RFI"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "\"HVAC crew cut the membrane setting a unit\" is a(n):",
          "options": [
            "Issue",
            "Punch item",
            "RFI"
          ]
        },
        {
          "id": "4",
          "type": "multi",
          "q": "Fields every issue should have (select all):",
          "options": [
            "Title",
            "Assignee",
            "Due date",
            "Location / pin",
            "Lunch order",
            "Favorite color"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "Pin colors red / orange / green mean:",
          "options": [
            "Today / This week / Next week",
            "Roofing / Mech / Plumbing",
            "High / Medium / Low priority",
            "Open / In Review / Closed"
          ]
        },
        {
          "id": "6",
          "type": "text",
          "q": "Rewrite this issue title so someone else can find and fix it: \"Leak.\""
        },
        {
          "id": "7",
          "type": "mc",
          "q": "Tool used to find unwelded seams before closing punch items:",
          "options": [
            "Tape measure",
            "Seam probe",
            "Level",
            "Chalk line"
          ]
        },
        {
          "id": "8",
          "type": "mc",
          "q": "Why photograph damage by other trades the same day?",
          "options": [
            "OSHA requires daily photos",
            "Photos expire",
            "Proves who caused it before it's covered or blamed on the roofer",
            "To post online"
          ]
        }
      ]
    },
    {
      "id": "quiz5",
      "kind": "Quiz",
      "title": "Quiz 5 – RFIs & Submittals",
      "module": 5,
      "questions": [
        {
          "id": "1",
          "type": "mc",
          "q": "RFI stands for:",
          "options": [
            "Roofing Field Inspection",
            "Request for Information",
            "Report of Field Issues",
            "Revised Flashing Instruction"
          ]
        },
        {
          "id": "2",
          "type": "mc",
          "q": "Correct RFI status order:",
          "options": [
            "Open → Draft → Closed → Answered",
            "Draft → Closed → Open → Answered",
            "Answered → Open → Draft → Closed",
            "Draft → Open → Answered → Closed"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "While an RFI is Open, the ball is in court with:",
          "options": [
            "Nobody",
            "The architect / reviewer it's assigned to",
            "The apprentice who found it",
            "The owner"
          ]
        },
        {
          "id": "4",
          "type": "multi",
          "q": "References that make an RFI clear (select all):",
          "options": [
            "Spec section",
            "Sheet / detail number",
            "Your hourly wage",
            "Location (roof area, drain, curb)",
            "Today's weather"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "Why include a suggested solution?",
          "options": [
            "Makes it fast to approve and keeps the job moving",
            "It sets the price",
            "It isn't useful",
            "It's required by law"
          ]
        },
        {
          "id": "6",
          "type": "mc",
          "q": "CSI division for roofing & waterproofing:",
          "options": [
            "Division 03",
            "Division 09",
            "Division 07",
            "Division 26"
          ]
        },
        {
          "id": "7",
          "type": "mc",
          "q": "Tapered layout submittal is \"Revise & Resubmit.\" Can you start setting taper?",
          "options": [
            "Yes, submittals don't matter",
            "Yes, if the foreman says so",
            "Only in Roof Area B",
            "No – wait for an approved resubmittal"
          ]
        },
        {
          "id": "8",
          "type": "mc",
          "q": "\"Approved as Noted\" means:",
          "options": [
            "Only the architect may install it",
            "Don't order",
            "Rejected",
            "Order and install, but follow the reviewer's notes"
          ]
        },
        {
          "id": "9",
          "type": "mc",
          "q": "An unapproved product substitution can:",
          "options": [
            "Make the roof stronger automatically",
            "Void the manufacturer's NDL warranty",
            "Speed up the inspection",
            "Nothing – it doesn't matter"
          ]
        }
      ]
    },
    {
      "id": "quiz6",
      "kind": "Quiz",
      "title": "Quiz 6 – Photos, Daily Reports & Revisions",
      "module": 6,
      "questions": [
        {
          "id": "1",
          "type": "multi",
          "q": "When should you take photos? (select all)",
          "options": [
            "Problems / damage",
            "Before cover-up",
            "Only at the end of the job",
            "Weather conditions that stop work",
            "Completed details",
            "Your lunch"
          ]
        },
        {
          "id": "2",
          "type": "text",
          "q": "Write a good caption for a photo of RD-2 after the clamping ring is installed."
        },
        {
          "id": "3",
          "type": "mc",
          "q": "The daily report is the \"legal diary\" because:",
          "options": [
            "Lawyers write it",
            "It's the dated official record used in disputes and claims",
            "It's optional",
            "It's private"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "Why record weather delays (dew, rain, wind) with times?",
          "options": [
            "Justifies lost time and proves no roofing was installed in bad conditions",
            "It's just for fun",
            "The weather service asks for it",
            "To get paid overtime automatically"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "ASI stands for:",
          "options": [
            "Additional Scope Invoice",
            "Architect's Supplemental Instruction",
            "Approved Safety Inspection",
            "As-built Sheet Index"
          ]
        },
        {
          "id": "6",
          "type": "multi",
          "q": "Symbols that show where a revision was made (select all):",
          "options": [
            "North arrow",
            "Revision cloud",
            "Delta triangle with number",
            "Scale bar"
          ]
        },
        {
          "id": "7",
          "type": "mc",
          "q": "In an overlay compare:",
          "options": [
            "Everything is gray",
            "Red = added, blue = removed",
            "Blue = added, red = removed",
            "Green = added, black = removed"
          ]
        },
        {
          "id": "8",
          "type": "mc",
          "q": "When a new sheet version is published, your markups and issues:",
          "options": [
            "Are deleted",
            "Carry forward to the new version",
            "Stay only on the old version",
            "Get emailed to the architect"
          ]
        }
      ]
    },
    {
      "id": "lab1",
      "kind": "Lab worksheet",
      "title": "Lab 1 – Drawing Set Scavenger Hunt",
      "module": 1,
      "questions": [
        {
          "id": "1",
          "type": "num",
          "q": "How many sheets are in the set?",
          "unit": "sheets"
        },
        {
          "id": "2",
          "type": "mc",
          "q": "Roof membrane specified:",
          "options": [
            "2-ply SBS modified bitumen",
            "45-mil EPDM",
            "60-mil TPO",
            "4-ply BUR"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "How is the membrane attached?",
          "options": [
            "Loose laid",
            "Ballasted",
            "Mechanically fastened",
            "Fully adhered with bonding adhesive"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "Roof slope and how it's created:",
          "options": [
            "1/2\":12\" sloped deck",
            "1/8\":12\" sloped structure",
            "1/4\":12\" with tapered insulation",
            "Dead flat"
          ]
        },
        {
          "id": "5",
          "type": "num",
          "q": "Minimum base flashing height:",
          "unit": "inches"
        },
        {
          "id": "6",
          "type": "num",
          "q": "Minimum distance from penetrations to curbs/walls:",
          "unit": "inches"
        },
        {
          "id": "7",
          "type": "num",
          "q": "Number of primary roof drains:",
          "unit": ""
        },
        {
          "id": "8",
          "type": "num",
          "q": "Number of overflow drains:",
          "unit": ""
        },
        {
          "id": "9",
          "type": "num",
          "q": "How much higher are overflow inlets than primary drains?",
          "unit": "inches"
        },
        {
          "id": "10",
          "type": "num",
          "q": "Taper thickness at the low line:",
          "unit": "inches"
        },
        {
          "id": "11",
          "type": "num",
          "q": "Taper thickness at the north parapet:",
          "unit": "inches"
        },
        {
          "id": "12",
          "type": "multi",
          "q": "What did ASI-01 add? (select all)",
          "options": [
            "RTU-4 curb",
            "Walkway pads to RTU-4",
            "A second skylight",
            "Cricket at RTU-4",
            "A new roof drain",
            "1 pipe penetration"
          ]
        },
        {
          "id": "13",
          "type": "mc",
          "q": "Manufacturer warranty required:",
          "options": [
            "5-year contractor",
            "20-year NDL",
            "None",
            "10-year material only"
          ]
        },
        {
          "id": "14",
          "type": "num",
          "q": "Minimum TPO heat-weld width:",
          "unit": "inches"
        },
        {
          "id": "15",
          "type": "mc",
          "q": "Outside the below-grade membrane, in order:",
          "options": [
            "Drainage composite → backfill → protection board",
            "Nothing – backfill directly",
            "Backfill → protection board → drainage composite",
            "Protection board → drainage composite → backfill"
          ]
        },
        {
          "id": "16",
          "type": "mc",
          "q": "Test required for the elevator pit:",
          "options": [
            "No test",
            "Pull test",
            "24-hour flood test",
            "Seam probe only"
          ]
        },
        {
          "id": "17",
          "type": "mc",
          "q": "Answer to RFI-001:",
          "options": [
            "Add a 2x6 treated nailer and raise the coping",
            "Cut the flashing to 6\"",
            "Remove the insulation",
            "No change"
          ]
        },
        {
          "id": "18",
          "type": "mc",
          "q": "Which submittal is Revise & Resubmit?",
          "options": [
            "07 62 00-01 Sheet Metal",
            "07 13 26-01 Waterproofing",
            "07 22 00-01 Tapered Insulation Layout",
            "07 54 23-01 TPO Roofing"
          ]
        },
        {
          "id": "19",
          "type": "num",
          "q": "BONUS: minimum distance of a warning line from an unprotected edge:",
          "unit": "feet"
        }
      ]
    },
    {
      "id": "lab3",
      "kind": "Lab worksheet",
      "title": "Lab 3 – Roof & Waterproofing Takeoff",
      "module": 3,
      "questions": [
        {
          "id": "a_area",
          "type": "num",
          "q": "Roof Area A (west parapet to area divider):",
          "unit": "SF"
        },
        {
          "id": "a_sq",
          "type": "num",
          "q": "Roof Area A:",
          "unit": "squares"
        },
        {
          "id": "b_area",
          "type": "num",
          "q": "Roof Area B (area divider to east parapet):",
          "unit": "SF"
        },
        {
          "id": "b_sq",
          "type": "num",
          "q": "Roof Area B:",
          "unit": "squares"
        },
        {
          "id": "t_sq",
          "type": "num",
          "q": "Total roof:",
          "unit": "squares"
        },
        {
          "id": "pipes",
          "type": "num",
          "q": "Pipe penetrations (current revision):",
          "unit": ""
        },
        {
          "id": "rtus",
          "type": "num",
          "q": "Equipment curbs (RTUs):",
          "unit": ""
        },
        {
          "id": "rd",
          "type": "num",
          "q": "Primary roof drains:",
          "unit": ""
        },
        {
          "id": "od",
          "type": "num",
          "q": "Overflow drains:",
          "unit": ""
        },
        {
          "id": "crickets",
          "type": "num",
          "q": "Crickets:",
          "unit": ""
        },
        {
          "id": "base",
          "type": "num",
          "q": "Base flashing – inside face of parapet:",
          "unit": "LF"
        },
        {
          "id": "coping",
          "type": "num",
          "q": "Coping – outside face:",
          "unit": "LF"
        },
        {
          "id": "rolls",
          "type": "num",
          "q": "Area B TPO rolls (10'×100', +10% waste):",
          "unit": "rolls"
        },
        {
          "id": "iso",
          "type": "num",
          "q": "Area B flat polyiso 4'×8', 2 layers, +5%:",
          "unit": "boards"
        },
        {
          "id": "cover",
          "type": "num",
          "q": "Area B cover board 4'×8', +5%:",
          "unit": "boards"
        },
        {
          "id": "boots",
          "type": "num",
          "q": "Pipe boots needed in Area B:",
          "unit": ""
        },
        {
          "id": "perim",
          "type": "num",
          "q": "Basement perimeter (outside of wall):",
          "unit": "LF"
        },
        {
          "id": "wall",
          "type": "num",
          "q": "Wall waterproofing area:",
          "unit": "SF"
        },
        {
          "id": "wprolls",
          "type": "num",
          "q": "Waterproofing rolls (200 SF, +10%):",
          "unit": "rolls"
        },
        {
          "id": "drain",
          "type": "num",
          "q": "Footing drain length (path tool):",
          "unit": "LF"
        },
        {
          "id": "sleeves",
          "type": "num",
          "q": "Pipe sleeves through the foundation wall:",
          "unit": ""
        }
      ]
    },
    {
      "id": "lab5",
      "kind": "Lab worksheet",
      "title": "Lab 5 – RTU-4 Conflict Worksheet",
      "module": 5,
      "questions": [
        {
          "id": "curb",
          "type": "num",
          "q": "RTU-4 curb height per ASI-01:",
          "unit": "inches"
        },
        {
          "id": "revised",
          "type": "mc",
          "q": "Which sheets did ASI-01 revise?",
          "options": [
            "Every roofing sheet",
            "R-101 only",
            "None",
            "R-101 and R-102"
          ]
        },
        {
          "id": "thick",
          "type": "num",
          "q": "Total roof thickness at the NORTH side of the RTU-4 curb (flat + taper + cover board):",
          "unit": "inches"
        },
        {
          "id": "avail",
          "type": "num",
          "q": "Flashing height available at the north side of the curb:",
          "unit": "inches"
        },
        {
          "id": "enough",
          "type": "mc",
          "q": "Is that enough for detail 4/R-501?",
          "options": [
            "Yes",
            "No"
          ]
        },
        {
          "id": "cricket",
          "type": "mc",
          "q": "Is the RTU-4 cricket shown on R-102?",
          "options": [
            "Yes",
            "No"
          ]
        },
        {
          "id": "min",
          "type": "num",
          "q": "Minimum curb height for 8\" of flashing on the LOW (south) side:",
          "unit": "inches"
        }
      ]
    },
    {
      "id": "lab6",
      "kind": "Lab worksheet",
      "title": "Lab 6 – Revision Compare Worksheet",
      "module": 6,
      "questions": [
        {
          "id": "rev",
          "type": "num",
          "q": "Current revision number of R-101:",
          "unit": ""
        },
        {
          "id": "set",
          "type": "mc",
          "q": "Version set name of the current R-101:",
          "options": [
            "Conformed Set",
            "Bulletin 3",
            "ASI-01",
            "Bid Set"
          ]
        },
        {
          "id": "changes",
          "type": "multi",
          "q": "What changed from Rev 0 to Rev 1? (select all)",
          "options": [
            "Cricket at RTU-4 added",
            "Skylight removed",
            "RTU-4 curb added",
            "RD-3 moved",
            "Area divider moved",
            "1 pipe penetration added near the east parapet",
            "Walkway pads extended to RTU-4"
          ]
        }
      ]
    },
    {
      "id": "final",
      "kind": "Final exam",
      "title": "Final Exam – Written Part",
      "module": 7,
      "points": 2,
      "questions": [
        {
          "id": "1",
          "type": "mc",
          "q": "Sheet number vs version set:",
          "options": [
            "They're the same thing",
            "The number identifies the drawing; the version set is the issue it came in",
            "The number is the revision",
            "The version set is the page count"
          ]
        },
        {
          "id": "2",
          "type": "mc",
          "q": "Layer turned over to the owner at closeout:",
          "options": [
            "Published",
            "Personal",
            "As-Built"
          ]
        },
        {
          "id": "3",
          "type": "mc",
          "q": "Tool to show a changed area:",
          "options": [
            "Calibrate",
            "Photo pin",
            "Count",
            "Revision cloud"
          ]
        },
        {
          "id": "4",
          "type": "mc",
          "q": "How to follow a detail callout:",
          "options": [
            "It can't be done",
            "Print it",
            "Click the bubble with the Select tool",
            "Search the sheet number"
          ]
        },
        {
          "id": "5",
          "type": "mc",
          "q": "Before measuring on an uploaded PDF you must:",
          "options": [
            "Publish it",
            "Nothing",
            "Calibrate it",
            "Stamp it"
          ]
        },
        {
          "id": "6",
          "type": "num",
          "q": "SF in one roofing square:",
          "unit": "SF"
        },
        {
          "id": "7",
          "type": "multi",
          "q": "A good issue has (select all):",
          "options": [
            "The foreman's phone password",
            "Due date",
            "Assignee",
            "Title",
            "Location / pin"
          ]
        },
        {
          "id": "8",
          "type": "mc",
          "q": "\"Roof plan shows a drain where the tapered layout shows a high point\" is a(n):",
          "options": [
            "Issue",
            "Punch item",
            "RFI"
          ]
        },
        {
          "id": "9",
          "type": "mc",
          "q": "RFI status order:",
          "options": [
            "Open, Draft, Closed, Answered",
            "Draft, Open, Answered, Closed",
            "Closed, Open, Draft, Answered"
          ]
        },
        {
          "id": "10",
          "type": "mc",
          "q": "\"Ball in court\" means:",
          "options": [
            "Who must act next",
            "Who pays",
            "Who is at fault",
            "Who wrote it"
          ]
        },
        {
          "id": "11",
          "type": "mc",
          "q": "Can you install membrane from a \"Rejected\" submittal?",
          "options": [
            "Yes",
            "No"
          ]
        },
        {
          "id": "12",
          "type": "mc",
          "q": "ASI stands for:",
          "options": [
            "As-built Sheet Index",
            "Approved Safety Inspection",
            "Architect's Supplemental Instruction"
          ]
        },
        {
          "id": "13",
          "type": "mc",
          "q": "In compare, \"added\" shows as:",
          "options": [
            "Gray",
            "Blue",
            "Green",
            "Red"
          ]
        },
        {
          "id": "14",
          "type": "multi",
          "q": "Moments to take photos on a roof (select all):",
          "options": [
            "Finished details",
            "Problems / damage",
            "Only when asked",
            "Before cover-up"
          ]
        },
        {
          "id": "15",
          "type": "multi",
          "q": "Roofing closeout package items (select all):",
          "options": [
            "Lunch receipts",
            "As-built roof plan",
            "Manufacturer NDL warranty",
            "Closed punch list",
            "Mfr final inspection report",
            "Crew's timesheets"
          ]
        },
        {
          "id": "16",
          "type": "mc",
          "q": "Why dimension as-builts from fixed references?",
          "options": [
            "Required by the app",
            "It looks nicer",
            "It doesn't matter",
            "So hidden or buried items can be found later"
          ]
        },
        {
          "id": "17",
          "type": "num",
          "q": "Minimum base flashing height in this project:",
          "unit": "inches"
        },
        {
          "id": "18",
          "type": "num",
          "q": "Minimum TPO weld width in the spec:",
          "unit": "inches"
        },
        {
          "id": "19",
          "type": "mc",
          "q": "Outside the below-grade membrane, in order:",
          "options": [
            "Nothing",
            "Protection board → drainage composite → backfill",
            "Backfill → drainage composite"
          ]
        },
        {
          "id": "20",
          "type": "mc",
          "q": "Test required for the elevator pit:",
          "options": [
            "Pull test",
            "24-hour flood test",
            "Seam probe"
          ]
        },
        {
          "id": "21",
          "type": "mc",
          "q": "Purpose of a toolbox talk sign-in:",
          "options": [
            "Tracks lunch",
            "Clocks people in",
            "None",
            "Documents who received the safety training"
          ]
        },
        {
          "id": "22",
          "type": "mc",
          "q": "When is it OK to publish a markup?",
          "options": [
            "Only at closeout",
            "Never",
            "Always, immediately",
            "When it's accurate, clean and meant for the team"
          ]
        },
        {
          "id": "23",
          "type": "mc",
          "q": "Roof plan and details disagree. You should:",
          "options": [
            "Pick the one you like",
            "Ignore it",
            "Build it both ways",
            "Tell the foreman – it likely needs an RFI"
          ]
        },
        {
          "id": "24",
          "type": "multi",
          "q": "Apps that do a similar job to PlanGrid / Autodesk Build (select all):",
          "options": [
            "Spotify",
            "Bluebeam Revu",
            "Candy Crush",
            "Procore",
            "Fieldwire"
          ]
        },
        {
          "id": "25",
          "type": "num",
          "q": "Minimum warning-line distance from an unprotected edge:",
          "unit": "feet"
        }
      ]
    },
    {
      "id": "att",
      "kind": "Blueprint exercise",
      "title": "AT&T Reroof Blueprint Exercise (real plans)",
      "module": 3,
      "intro": "Use the AT&T Upper Roof Replacement plan set your instructor gives you (upload it under Sheets → Upload). All answers are contained within the prints.",
      "questions": [
        {
          "id": "1",
          "type": "text",
          "q": "What is the first thing applied over the concrete deck?"
        },
        {
          "id": "2",
          "type": "text",
          "q": "Who wrote the roofing specs?"
        },
        {
          "id": "3",
          "type": "text",
          "q": "What is detail 3/A501?"
        },
        {
          "id": "4",
          "type": "num",
          "q": "How many times does detail 3/A501 appear on the roof (sheet A101)?",
          "unit": "times"
        },
        {
          "id": "5",
          "type": "text",
          "q": "What is detail 1/A501 and where is it used?"
        },
        {
          "id": "6",
          "type": "text",
          "q": "Does anything have to be demoed by others? What? Who? How many?"
        },
        {
          "id": "7",
          "type": "text",
          "q": "What does the finish roof slope need to be?"
        },
        {
          "id": "8",
          "type": "text",
          "q": "Do you see any issues or concerns about how the cricket plan is drawn?"
        },
        {
          "id": "9",
          "type": "text",
          "q": "What unique safety concerns, if any, do you have?"
        },
        {
          "id": "10",
          "type": "text",
          "q": "What goes under the RF Barrier Posts?"
        },
        {
          "id": "11",
          "type": "text",
          "q": "What roof work is excluded?"
        },
        {
          "id": "12",
          "type": "text",
          "q": "In what scale is detail 8/A501 drawn?"
        },
        {
          "id": "13",
          "type": "text",
          "q": "On what page (sheet number) do you find the mechanical demo?"
        },
        {
          "id": "14",
          "type": "text",
          "q": "What demoed mechanical equipment does not get replaced?"
        },
        {
          "id": "15",
          "type": "text",
          "q": "What must be done to locate rebar in the roof deck before cutting or drilling?"
        },
        {
          "id": "16",
          "type": "text",
          "q": "List the layers of the new roof in order starting with the concrete deck."
        },
        {
          "id": "17",
          "type": "text",
          "q": "What type of warranty is required and by whom?"
        },
        {
          "id": "18",
          "type": "text",
          "q": "What work must be performed first?"
        },
        {
          "id": "19",
          "type": "text",
          "q": "What does (MOP) stand for?"
        },
        {
          "id": "20",
          "type": "text",
          "q": "Google Earth the project (217 W. Acequia Ave, Visalia, CA) and list any concerns you see."
        }
      ]
    }
  ];  // Practice version of the blueprint exercise: same 20 questions, answered from the fictional
  // JATC Training Center Roof Replacement plan set (posted with the app – Sheets → Load practice plans).
  (() => {
    const a = SETS.find((x) => x.id === "att");
    SETS.push({ ...a, id: "practice", title: "Training Center Reroof – Practice Plan Exercise",
      intro: "Use the JATC Training Center Roof Replacement practice plans (Sheets → 📐 Load practice plans, or the PDF your instructor gives you). All answers are contained within the prints.",
      // #20 points to the practice project's address (the JATC), not the AT&T site
      questions: a.questions.map((q) => (q.id === "20" ? { ...q, q: "Google Earth the project (5537 E. Lamona Ave. #1, Fresno, CA 93727) and list any concerns you see." } : { ...q })) });
  })();


  /* Each apprentice sees the answer choices in a different order (seeded by their name), so
     "the answer is B" can't be passed around. Answers are stored by the original option
     index, so grading is unaffected. True/False, Yes/No and Issue/Punch/RFI stay in order. */
  function order(setId, q) {
    if (!q.options) return [];
    const n = q.options.length, idx = [...Array(n).keys()];
    if (n <= 2 || q.options.join("|") === IPR.join("|")) return idx;
    let h = 2166136261; for (const c of `${store.get().user?.name || ""}|${setId}|${q.id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }
  const all = () => SETS;
  const find = (id) => SETS.find((s) => s.id === id);
  const bucket = () => { const s = store.get(); s.quizzes = s.quizzes || {}; s.quizzes[store.pid()] = s.quizzes[store.pid()] || {}; return s.quizzes[store.pid()]; };
  const statusOf = (id) => { const r = bucket()[id]; return !r ? "Not started" : r.submittedAt ? "Submitted" : "Draft"; };

  function list(root) {
    const groups = ["Quiz", "Lab worksheet", "Blueprint exercise", "Final exam"];
    root.innerHTML = `<div class="page-head"><h1>Quizzes & Worksheets</h1></div>
      <p class="muted">Answer here in the app. When you <b>Submit</b>, your answers are saved in your backup file – your instructor grades them automatically when you turn in
      <b>Settings → Export backup</b>. You can change answers and submit again until your instructor collects the file.</p>
      ${groups.map((g) => `<section class="card"><h2>${g === "Quiz" ? "Quizzes" : g === "Lab worksheet" ? "Lab worksheets" : g === "Blueprint exercise" ? "Blueprint exercises (real plan sets)" : "Final exam (written part)"}</h2>
        <table class="tbl click"><tbody>${SETS.filter((s) => s.kind === g).map((s) => { const st = statusOf(s.id); const r = bucket()[s.id];
          return `<tr data-q="${s.id}"><td><b>${esc(s.title)}</b></td><td>${s.questions.length} questions</td><td><span class="badge st-${st === "Submitted" ? "Closed" : st === "Draft" ? "InReview" : "Open"}">${st}</span></td><td class="muted small">${r?.submittedAt ? "Submitted " + fmtDateTime(r.submittedAt) : ""}</td></tr>`; }).join("")}</tbody></table></section>`).join("")}`;
    $$("tr[data-q]", root).forEach((tr) => (tr.onclick = () => (location.hash = "#/quiz/" + tr.dataset.q)));
  }

  function take(root, id) {
    const set = find(id); if (!set) return list(root);
    const saved = bucket()[id] || { answers: {} };
    const A = { ...(saved.answers || {}) };
    const old = saved.submittedAt && saved.v !== 2; // answered before the choices were reshuffled
    if (saved.answers && saved.v !== 2) for (const q of set.questions) if (q.options) delete A[q.id];
    root.innerHTML = `<div class="page-head"><h1>${esc(set.title)}</h1><div class="actions"><a class="btn" href="#/quizzes">← All quizzes</a></div></div>
      ${old ? `<div class="card" style="border-color:var(--orange)">This quiz was updated after you submitted it. Your earlier submission is still saved and will be graded. If you want to change anything, answer the multiple-choice questions again and submit.</div>` : ""}
      ${set.intro ? `<div class="card">${esc(set.intro)}</div>` : ""}
      ${saved.submittedAt ? `<div class="card" style="border-color:var(--green)">✔ Submitted ${fmtDateTime(saved.submittedAt)}${saved.attempts > 1 ? ` (attempt ${saved.attempts})` : ""}. You can still change answers and submit again.</div>` : ""}
      <form id="qf" class="card">
      ${set.questions.map((q, i) => {
        const a = A[q.id];
        let input = "";
        const ord = order(set.id, q);
        if (q.type === "mc") input = ord.map((k) => `<label class="check qopt"><input type="radio" name="${q.id}" value="${k}" ${String(a) === String(k) ? "checked" : ""}> ${esc(q.options[k])}</label>`).join("");
        else if (q.type === "multi") input = ord.map((k) => `<label class="check qopt"><input type="checkbox" name="${q.id}" value="${k}" ${(a || []).map(String).includes(String(k)) ? "checked" : ""}> ${esc(q.options[k])}</label>`).join("");
        else if (q.type === "num") input = `<div class="row gap"><input type="number" step="any" name="${q.id}" value="${esc(a ?? "")}" style="width:9em"> <span class="muted">${esc(q.unit || "")}</span></div>`;
        else input = `<textarea name="${q.id}" rows="2">${esc(a ?? "")}</textarea>`;
        return `<div class="qblock"><p><b>${i + 1}.</b> ${esc(q.q)} ${q.type === "multi" ? '<span class="muted small">(select all that apply)</span>' : ""}</p>${input}</div>`;
      }).join("")}
      <div class="row gap"><button type="button" class="btn" id="qSave">Save draft</button><button type="submit" class="btn btn-primary">Submit answers</button></div>
      </form>`;
    const collect = () => {
      const f = $("#qf", root), out = {};
      for (const q of set.questions) {
        if (q.type === "multi") out[q.id] = $$(`input[name="${q.id}"]:checked`, f).map((x) => +x.value);
        else if (q.type === "mc") { const c = $(`input[name="${q.id}"]:checked`, f); if (c) out[q.id] = +c.value; }
        else { const v = $(`[name="${q.id}"]`, f).value.trim(); /* not f.elements[id]: a numeric id is read as an index */ if (v !== "") out[q.id] = q.type === "num" ? parseFloat(v) : v; }
      }
      return out;
    };
    $("#qSave", root).onclick = () => { bucket()[id] = { ...saved, v: 2, answers: collect(), savedAt: new Date().toISOString() }; store.emit(); toast("Draft saved", "ok"); };
    $("#qf", root).onsubmit = (e) => {
      e.preventDefault();
      const ans = collect();
      const missing = set.questions.filter((q) => ans[q.id] === undefined || (Array.isArray(ans[q.id]) && !ans[q.id].length)).length;
      const go = () => {
        bucket()[id] = { v: 2, answers: ans, savedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), attempts: (saved.attempts || 0) + 1 };
        store.log(`Submitted ${set.title}`); store.event("quiz_submitted", { quiz: id }); toast("Submitted – export your backup when your instructor asks", "ok");
        location.hash = "#/quizzes";
      };
      if (missing) PT.util.confirmBox(`${missing} question(s) are blank. Submit anyway?`, go, "Submit"); else go();
    };
  }

  return { SETS, all, find, list, take, statusOf };
})();
