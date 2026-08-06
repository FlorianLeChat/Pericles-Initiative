<script lang="ts">
    /**
     * Switches between the light and dark theme.
     *
     * The initial theme is applied by an inline script in `app.html`, so this
     * component only has to read the resulting class and flip it.
     *
     * @author Claude
     */
    import { onMount } from "svelte";
    import Icon from "./Icon.svelte";

    const SUN
        = "M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z";
    const MOON
        = "M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z";

    let dark = $state( false );

    onMount( () =>
    {
        dark = document.documentElement.classList.contains( "dark" );
    } );

    /**
     * Flips the theme and remembers the choice.
     *
     * @author Claude
     */
    const toggle = (): void =>
    {
        dark = !dark;
        document.documentElement.classList.toggle( "dark", dark );

        try
        {
            localStorage.setItem( "pericles:theme", dark ? "dark" : "light" );
        }
        catch
        {
            /* storage unavailable, the choice simply is not remembered */
        }
    };
</script>

<button
    type="button"
    class="btn btn-ghost h-9 w-9 px-0"
    onclick={toggle}
    aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
    title={dark ? "Thème clair" : "Thème sombre"}
>
    <Icon path={dark ? SUN : MOON} class="h-[18px] w-[18px]" />
</button>
