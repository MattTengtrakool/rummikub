import error from "@/lang/en/error.json";
import pages from "@/lang/en/pages.json";
import toast from "@/lang/en/toast.json";
import rules from "@/lang/en/rules.json";
import card from "@/lang/en/components/card.json";

export default defineI18nLocale((_locale) => {
  return {
    pages,
    toast,
    error,
    rules,
    components: {
      card
    }
  };
});
