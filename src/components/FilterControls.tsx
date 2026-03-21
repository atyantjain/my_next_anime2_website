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
}

const FilterControls = ({
  topK, onTopKChange,
  useMinScore, onUseMinScoreChange,
  minScore, onMinScoreChange,
  sameGenreOnly, onSameGenreChange,
}: Props) => (
  <div className="space-y-3 text-sm">
    <div>
      <label className="text-muted-foreground">How many recommendations? <span className="font-semibold text-foreground">{topK}</span></label>
      <Slider value={[topK]} min={5} max={30} step={1} onValueChange={([v]) => onTopKChange(v)} className="mt-1" />
    </div>
    <div className="flex items-center gap-2">
      <Checkbox checked={useMinScore} onCheckedChange={(v) => onUseMinScoreChange(!!v)} id="min-score" />
      <label htmlFor="min-score" className="text-muted-foreground cursor-pointer">Filter by min MAL score</label>
      {useMinScore && (
        <div className="flex items-center gap-2 ml-2">
          <Slider value={[minScore]} min={0} max={10} step={0.1} onValueChange={([v]) => onMinScoreChange(v)} className="w-24" />
          <span className="font-semibold text-foreground">{minScore.toFixed(1)}</span>
        </div>
      )}
    </div>
    <div className="flex items-center gap-2">
      <Checkbox checked={sameGenreOnly} onCheckedChange={(v) => onSameGenreChange(!!v)} id="same-genre" />
      <label htmlFor="same-genre" className="text-muted-foreground cursor-pointer">Only overlapping genres</label>
    </div>
  </div>
);

export default FilterControls;
