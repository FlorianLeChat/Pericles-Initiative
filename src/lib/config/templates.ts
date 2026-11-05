/**
 * Templates a page can be started from.
 *
 * A template is a starting point and nothing more: it writes the usual dates,
 * infobox rows and body sections of a kind of page, offers the matching kind of
 * invented name, and is forgotten once applied. Nothing records which one a
 * page came from, since pages carry no type: a character is still classified by
 * its categories, and the rows a template wrote are ordinary rows to rename or
 * remove. A row or a section left empty is dropped when the page is saved.
 *
 * Every text is a message function rather than a string, read when the template
 * is applied, so a template follows the language the interface is in by then.
 *
 * @author Claude
 */

import Box from "@lucide/svelte/icons/box";
import User from "@lucide/svelte/icons/user";
import * as m from "#lib/locales/messages.js";
import Flame from "@lucide/svelte/icons/flame";
import MapPin from "@lucide/svelte/icons/map-pin";
import type { GeneratorKind } from "./generator.ts";
import Landmark from "@lucide/svelte/icons/landmark";
import FileText from "@lucide/svelte/icons/file-text";
import Lightbulb from "@lucide/svelte/icons/lightbulb";

/** A text the template reads at the moment it is applied. */
type Text = () => string;

/** One template, from the blank page to the character. */
export interface PageTemplate {
    /** Never stored, which is why it is English like the rest of the code. */
    id: "blank" | "character" | "place" | "organisation" | "event" | "object" | "concept";
    icon: typeof User;
    label: Text;
    /** Placeholder of the title, saying what this kind of page asks for. */
    titlePlaceholder: Text;
    /** Placeholder of the summary, asking the question this kind of page answers. */
    summaryPlaceholder: Text;
    /** Intitulés of the dates written, empty, into the card. */
    dates: readonly Text[];
    /** Intitulés of the infobox rows written, empty, into the card. */
    rows: readonly Text[];
    /** Level two headings the body starts with. */
    sections: readonly Text[];
    /** Kind of name the generator offers first. */
    generator: GeneratorKind;
}

/** The page with nothing written in advance, chosen until another one is. */
export const BLANK_TEMPLATE: PageTemplate = {
    id: "blank",
    icon: FileText,
    label: m.template_blank,
    titlePlaceholder: m.entry_form_title_placeholder,
    summaryPlaceholder: m.entry_form_summary_placeholder,
    dates: [],
    rows: [],
    sections: [],
    generator: "fullName"
};

/** Every template, in the order the editor offers them, the blank page last. */
export const PAGE_TEMPLATES: readonly PageTemplate[] = [
    {
        id: "character",
        icon: User,
        label: m.template_character,
        titlePlaceholder: m.template_character_title,
        summaryPlaceholder: m.template_character_summary,
        dates: [ m.dates_birth, m.dates_death ],
        rows: [
            m.template_row_first_name,
            m.template_row_last_name,
            m.template_row_age,
            m.template_row_parents,
            m.template_row_occupation,
            m.template_row_affiliation,
            m.template_row_residence
        ],
        sections: [ m.template_section_biography, m.template_section_personality, m.template_section_relations ],
        generator: "fullName"
    },
    {
        id: "place",
        icon: MapPin,
        label: m.template_place,
        titlePlaceholder: m.template_place_title,
        summaryPlaceholder: m.template_place_summary,
        dates: [ m.dates_foundation ],
        rows: [
            m.template_row_type,
            m.template_row_region,
            m.template_row_population,
            m.template_row_governed_by,
            m.template_row_landmarks
        ],
        sections: [ m.template_section_geography, m.template_section_history, m.template_section_society ],
        generator: "city"
    },
    {
        id: "organisation",
        icon: Landmark,
        label: m.template_organisation,
        titlePlaceholder: m.template_organisation_title,
        summaryPlaceholder: m.template_organisation_summary,
        dates: [ m.dates_foundation, m.dates_dissolution ],
        rows: [
            m.template_row_type,
            m.template_row_seat,
            m.template_row_leader,
            m.template_row_members,
            m.template_row_affiliation
        ],
        sections: [ m.template_section_history, m.template_section_structure, m.template_section_activities ],
        generator: "organisation"
    },
    {
        id: "event",
        icon: Flame,
        label: m.template_event,
        titlePlaceholder: m.template_event_title,
        summaryPlaceholder: m.template_event_summary,
        dates: [ m.dates_start, m.dates_end ],
        rows: [ m.template_row_place, m.template_row_participants, m.template_row_cause, m.template_row_outcome ],
        sections: [ m.template_section_context, m.template_section_course, m.template_section_aftermath ],
        generator: "date"
    },
    {
        id: "object",
        icon: Box,
        label: m.template_object,
        titlePlaceholder: m.template_object_title,
        summaryPlaceholder: m.template_object_summary,
        dates: [ m.dates_discovery ],
        rows: [ m.template_row_type, m.template_row_material, m.template_row_owner, m.template_row_origin ],
        sections: [ m.template_section_description, m.template_section_history ],
        generator: "fullName"
    },
    {
        id: "concept",
        icon: Lightbulb,
        label: m.template_concept,
        titlePlaceholder: m.template_concept_title,
        summaryPlaceholder: m.template_concept_summary,
        dates: [],
        rows: [ m.template_row_field, m.template_row_origin, m.template_row_related ],
        sections: [ m.template_section_definition, m.template_section_origins, m.template_section_applications ],
        generator: "fullName"
    },
    BLANK_TEMPLATE
];

/**
 * Writes the body a template starts a page with.
 *
 * @param template Template being applied.
 * @returns One empty level two section per heading, or nothing.
 * @author Claude
 */
export const templateBody = ( template: PageTemplate ): string =>
    template.sections.map( ( heading ) => `## ${ heading() }\n` ).join( "\n" );
