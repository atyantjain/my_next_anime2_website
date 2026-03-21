import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface Props {
  topK: number;
  onTopKChange: (v: number) => void;
  useMinScore: boolean;
  onUseMinScoreChange: (v: boolean) => void;
  minScore: number;
  onMinScoreChange: (v: number) => void;
  sameGenreOnly: boolean;
  onSameGenreChange: (v: boolean) => void;
  sameComposerOnly: boolean;
  onSameComposerChange: (v: boolean) => void;
}

const FilterControls = ({
  topK, onTopKChange,
  useMinScore, onUseMinScoreChange,
  minScore, onMinScoreChange,
  sameGenreOnly, onSameGenreChange,
  sameComposerOnly, onSameComposerChange,
}: Props) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
    <div className="flex items-center gap-2 min-w-[180px]">
      <label className="text-muted-foreground whitespace-nowrap">Results: <span className="font-semibold text-foreground">{topK}</span></label>
      <Slider value={[topK]} min={5} max={30} step={1} onValueChange={([v]) => onTopKChange(v)} className="w-24" />
    </div>
    <div className="flex items-center gap-1.5">
      <Checkbox checked={useMinScore} onCheckedChange={(v) => onUseMinScoreChange(!!v)} id="min-score" />
      <label htmlFor="min-score" className="text-muted-foreground cursor-pointer whitespace-nowrap">Min score</label>
      {useMinScore && (
        <div className="flex items-center gap-1.5 ml-1">
          <Slider value={[minScore]} min={0} max={10} step={0.1} onValueChange={([v]) => onMinScoreChange(v)} className="w-16" />
          <span className="font-semibold text-foreground">{minScore.toFixed(1)}</span>
        </div>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      <Checkbox checked={sameGenreOnly} onCheckedChange={(v) => onSameGenreChange(!!v)} id="same-genre" />
      <label htmlFor="same-genre" className="text-muted-foreground cursor-pointer whitespace-nowrap">Same genre</label>
    </div>
    <div className="flex items-center gap-1.5">
      <Checkbox checked={sameComposerOnly} onCheckedChange={(v) => onSameComposerChange(!!v)} id="same-composer" />
      <label htmlFor="same-composer" className="text-muted-foreground cursor-pointer whitespace-nowrap">Same composer</label>
    </div>
  </div>
);

export default FilterControls;
