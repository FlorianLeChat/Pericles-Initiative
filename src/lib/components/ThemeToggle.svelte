<script lang="ts">
    /**
     * Switches between the light and dark theme.
     *
     * The initial theme is applied by an inline script in `app.html`, so this
     * component only has to read the resulting class and flip it.
     *
     * @author Claude
     */
    import Moon from "@lucide/svelte/icons/moon";
    import Sun from "@lucide/svelte/icons/sun";
    import { onMount } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { scale } from "svelte/transition";
    import { motionDuration } from "$lib/config/motion";

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
    class="text-ink-600 hover:bg-paper-200 dark:text-paper-300 dark:hover:bg-ink-800 inline-flex h-11 w-11
           cursor-pointer items-center justify-center rounded-full transition lg:h-9 lg:w-9"
    onclick={toggle}
    aria-pressed={dark}
    aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
    title={dark ? "Thème clair" : "Thème sombre"}
>
    {#key dark}
        <span
            class="grid place-items-center"
            in:scale={{ start: 0.4, duration: motionDuration( 260 ), easing: cubicOut }}
        >
            {#if dark}
                <Sun class="h-[18px] w-[18px]" />
            {:else}
                <Moon class="h-[18px] w-[18px]" />
            {/if}
        </span>
    {/key}
</button>
