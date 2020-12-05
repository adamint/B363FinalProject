package bioinformatics;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

public class Motifs {
    public static List<String> generateKmers(String text, int k) {
        List<String> kmers = new ArrayList<>();
        for (int i = 0; i < text.length() - k + 1; i++) kmers.add(text.substring(i, i + k));
        return kmers;
    }

    public static int calculateHammingDistance(String first, String second) {
        int mismatches = 0;
        for (int i = 0; i < first.length(); i++) if (first.charAt(i) != second.charAt(i)) mismatches++;
        return mismatches;
    }

    public static List<String> cartesianString(List<String> input, List<String> product, int endLength) {
        if (input == null) return cartesianString(product, product, endLength);
        else if (input.get(0).length() == endLength) return input;

        List<String> newStrings = new ArrayList<>();
        for (String i : input) {
            for (String p : product) {
                newStrings.add(i + p);
            }
        }

        return cartesianString(newStrings, product, endLength);
    }

    public static int d(String pattern, List<String> motifs) {
        return motifs
                .stream()
                .map(motif -> d(pattern, motif))
                .reduce(0, Integer::sum);
    }

    public static int dIndex(String pattern, String text) {
        int k = pattern.length();
        List<String> kmers = generateKmers(text, k);
        int minKmerIndex = 0;

        for (int i = 1; i < kmers.size(); i++) {
            if (calculateHammingDistance(pattern, kmers.get(i)) < calculateHammingDistance(pattern, kmers.get(minKmerIndex))) {
                minKmerIndex = i;
            }
        }

        return minKmerIndex;
    }

    public static int d(String pattern, String text) {
        int k = pattern.length();
        List<String> kmers = generateKmers(text, k);
        return calculateHammingDistance(pattern, kmers.get(dIndex(pattern, text)));
    }

    public static String motif(String pattern, String text) {
        int k = pattern.length();
        List<String> kmers = generateKmers(text, k);
        return kmers.get(dIndex(pattern, text));
    }

    public static String medianString(List<String> dna, int k) {
        int distance = Integer.MAX_VALUE;
        String median = null;
        for (String pattern : cartesianString(null, Arrays.asList("A", "T", "G", "C"), k)) {
            if (distance >= d(pattern, dna)) {
                distance = d(pattern, dna);
                median = pattern;
            }
        }
        return median;
    }

    public static List<String> greedyMotifSearch(List<String> dna, int k, int t) {
        return greedyMotifSearch(dna, k, t, false);
    }

    public static List<String> greedyMotifSearch(List<String> dna, int k, int t, boolean useLaplace) {
        List<String> bestMotifs = dna.stream().map(seq -> seq.substring(0, k)).collect(Collectors.toList());
        for (String kmerMotif : generateKmers(dna.get(0), k)) {
            List<String> motifs = new ArrayList<>();
            motifs.add(kmerMotif);
            for (int i = 1; i < t; i++) {
                MotifMatrix motifsMatrix = new MotifMatrix(motifs, useLaplace);
                motifs.add(motifsMatrix.getProfileMostProbableKmer(dna.get(i), k));
            }
            if (new MotifMatrix(motifs).getScore() < new MotifMatrix(bestMotifs).getScore()) {
                bestMotifs = motifs;
            }
        }
        return bestMotifs;
    }

    public static List<String> randomizedMotifSearch(List<String> dna, int k, int t) {
        List<String> bestMotifs = new ArrayList<>();
        for (int i = 0; i < t; i++) {
            List<String> kmers = generateKmers(dna.get(i), k);
            bestMotifs.add(kmers.get(new Random().nextInt(kmers.size())));
        }
        List<String> motifs = new ArrayList<>(bestMotifs);
        while (true) {
            MotifMatrix matrix = new MotifMatrix(motifs, true);
            motifs = matrix.getProfileMostProbableKmers(dna, k);
            if (new MotifMatrix(motifs).getScore() < new MotifMatrix(bestMotifs).getScore()) {
                bestMotifs = motifs;
            } else return bestMotifs;
        }
    }

    public static List<String> randomizedMotifSearchIterations(List<String> dna, int k, int t, int iterations) {
        int lowest = Integer.MAX_VALUE;
        List<String> lowestVal = null;
        for (int i = 0; i < iterations; i++) {
            List<String> m = randomizedMotifSearch(dna, k, t);
            if (new MotifMatrix(m).getScore() < lowest) {
                lowestVal = m;
                lowest = new MotifMatrix(m).getScore();
            }
        }

        return lowestVal;
    }

    public static List<String> gibbsSampler(List<String> dna, int k, int t, int N) {
        Random random = new Random();
        List<String> motifs = new ArrayList<>();
        for (int i = 0; i < t; i++) {
            List<String> kmers = generateKmers(dna.get(i), k);
            motifs.add(kmers.get(random.nextInt(kmers.size())));
        }
        List<String> bestMotifs = new ArrayList<>(motifs);
        for (int j = 0; j < N; j++) {
            int i = random.nextInt(t);
            motifs.remove(i);
            MotifMatrix matrix = new MotifMatrix(motifs, true);
            String randomKmer = matrix.getProfileRandomlyGeneratedKmer(dna.get(i), k);
            motifs.add(i, randomKmer);
            if (new MotifMatrix(motifs, true).getScore() < new MotifMatrix(bestMotifs).getScore()) {
                bestMotifs = motifs;
            }
        }
        return bestMotifs;
    }

    public static List<String> randomizedGibbsSamplerIterations(List<String> dna, int k, int t, int N, int iterations) {
        int lowest = Integer.MAX_VALUE;
        List<String> lowestVal = null;
        for (int i = 0; i < iterations; i++) {
            List<String> m = gibbsSampler(dna, k, t, N);
            if (new MotifMatrix(m).getScore() < lowest) {
                lowestVal = m;
                lowest = new MotifMatrix(m).getScore();
            }
        }

        return lowestVal;
    }


}
