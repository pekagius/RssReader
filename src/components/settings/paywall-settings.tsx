import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { loadPaywallData, addPaywallPattern, removePaywallPattern } from '@/lib/paywall-store';
import type { PaywallPattern } from '@/types/feed';

function AddPatternDialog() {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [type, setType] = useState<'selector' | 'text'>('selector');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (type === 'selector') {
        // Test if selector is valid
        document.createDocumentFragment().querySelector(pattern);
      } else {
        // Test if regex is valid
        new RegExp(pattern);
      }
      
      addPaywallPattern({ name, pattern, type });
      
      toast({
        title: 'Pattern added',
        description: 'The paywall detection pattern has been added successfully.'
      });
      
      setName('');
      setPattern('');
      setType('selector');
      
      // Trigger re-render of the list
      window.dispatchEvent(new Event('paywall-updated'));
    } catch (error) {
      toast({
        title: 'Invalid pattern',
        description: 'Please check your pattern syntax and try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Pattern
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Paywall Detection Pattern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pattern Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Premium Content Marker"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Pattern Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'selector' | 'text')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selector">CSS Selector</SelectItem>
                <SelectItem value="text">Text Pattern (Regex)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pattern">Pattern</Label>
            <Input
              id="pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={
                type === 'selector'
                  ? '.paywall, .premium-content'
                  : 'Subscribe now|Premium article'
              }
              required
            />
            <p className="text-sm text-muted-foreground">
              {type === 'selector'
                ? 'Enter CSS selectors separated by commas'
                : 'Enter text patterns separated by | (pipe) character'}
            </p>
          </div>
          
          <Button type="submit" className="w-full">
            Add Pattern
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PaywallSettings() {
  const [patterns, setPatterns] = useState<PaywallPattern[]>(
    loadPaywallData().patterns
  );
  
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    removePaywallPattern(id);
    setPatterns(loadPaywallData().patterns);
    
    toast({
      title: 'Pattern removed',
      description: 'The paywall detection pattern has been removed.'
    });
    
    window.dispatchEvent(new Event('paywall-updated'));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configure patterns to detect paywalled articles
        </p>
        <AddPatternDialog />
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Pattern</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patterns.map((pattern) => (
            <TableRow key={pattern.id}>
              <TableCell>{pattern.name}</TableCell>
              <TableCell className="capitalize">{pattern.type}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-1 py-0.5 rounded">
                  {pattern.pattern}
                </code>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pattern.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}