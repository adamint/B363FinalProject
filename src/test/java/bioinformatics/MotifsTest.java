package bioinformatics;

import junit.framework.TestCase;
import org.junit.Assert;

import java.util.Arrays;
import java.util.List;

public class MotifsTest extends TestCase {
    MotifMatrix motifMatrix;

    public void setUp() throws Exception {
        List<String> motifs = Arrays.asList(
                "TCGGGGGTTTTT",
                "CCGGTGACTTAC",
                "ACGGGGATTTTC",
                "TTGGGGACTTTT",
                "AAGGGGACTTCC",
                "TTGGGGACTTCC",
                "TCGGGGATTCAT",
                "TCGGGGATTCCT",
                "TAGGGGAACTAC",
                "TCGGGTATAACC"
        );

        motifMatrix = new MotifMatrix(motifs);
    }

    public void testScore() {
        Assert.assertEquals(30, motifMatrix.getScore());
    }

    public void testConsensusString() {
        Assert.assertEquals("TCGGGGATTTCC", motifMatrix.getConsensus());
    }

    public void testEntropy() {
        Assert.assertEquals(9.91629, motifMatrix.getEntropy(), 0.0001);
    }

    public void testMotifFunction() {
        Assert.assertEquals("AAT", Motifs.motif("AAG", "GCAATCCTCAGC"));
    }

    public void testMedianString() {
        Assert.assertEquals(
                "GAC",
                Motifs.medianString(
                        Arrays.asList(
                                "AAATTGACGCAT",
                                "GACGACCACGTT",
                                "CGTCAGCGCCTG",
                                "GCTGAGCACCGG",
                                "AGTTCGGGACAG"
                        ),
                        3
                )
        );
    }

    public void testPr() {
        Assert.assertEquals(0.000839, motifMatrix.getProbabilityOfBeing("ACGGGGATTACC"), 0.000001);
    }

    public void testProfileMostProbableKmer() {
        Assert.assertEquals("CCGAG", new MotifMatrix(
                Arrays.asList(0.2, 0.2, 0.3, 0.2, 0.3),
                Arrays.asList(0.4, 0.3, 0.1, 0.5, 0.1),
                Arrays.asList(0.3, 0.3, 0.5, 0.2, 0.4),
                Arrays.asList(0.1, 0.2, 0.1, 0.1, 0.2)
        ).getProfileMostProbableKmer("ACCTGTTTATTGCCTAAGTTCCGAACAAACCCAATATAGCCCGAGGGCCT", 5));
    }

    public void testGreedyMotifSearch() {
        Assert.assertEquals(Arrays.asList("CAG", "CAG", "CAA", "CAA", "CAA"),
                Motifs.greedyMotifSearch(
                        Arrays.asList(
                                "GGCGTTCAGGCA",
                                "AAGAATCAGTCA",
                                "CAAGGAGTTCGC",
                                "CACGTCAATCAC",
                                "CAATAATATTCG"
                        ),
                        3,
                        5
                ));

        Assert.assertEquals(Arrays.asList("TTC", "ATC", "TTC", "ATC", "TTC"),
                Motifs.greedyMotifSearch(
                        Arrays.asList(
                                "GGCGTTCAGGCA",
                                "AAGAATCAGTCA",
                                "CAAGGAGTTCGC",
                                "CACGTCAATCAC",
                                "CAATAATATTCG"
                        ),
                        3,
                        5,
                        true
                ));
    }

    public void testRandomizedMotifSearch() {
        Assert.assertEquals(Arrays.asList("TCTCGGGG", "CCAAGGTG", "TACAGGCG", "TTCAGGTG", "TCCACGTG"),
                Motifs.randomizedMotifSearchIterations(
                        Arrays.asList(
                                "CGCCCCTCTCGGGGGTGTTCAGTAAACGGCCA",
                                "GGGCGAGGTATGTGTAAGTGCCAAGGTGCCAG",
                                "TAGTACCGAGACCGAAAGAAGTATACAGGCGT",
                                "TAGATCAAGTTTCAGGTGCACGTCGGTGAACC",
                                "AATCCACCAGCTCCACGTGCAATGTTGGCCTA"
                        ),
                        8,
                        5,
                        1000
                )
        );
    }

    public void testGibbsSampler() {
        Assert.assertEquals(Arrays.asList("TCTCGGGG", "CCAAGGTG", "TACAGGCG", "TTCAGGTG", "TCCACGTG"),
                Motifs.randomizedGibbsSamplerIterations(
                        Arrays.asList(
                                "CGCCCCTCTCGGGGGTGTTCAGTAAACGGCCA",
                                "GGGCGAGGTATGTGTAAGTGCCAAGGTGCCAG",
                                "TAGTACCGAGACCGAAAGAAGTATACAGGCGT",
                                "TAGATCAAGTTTCAGGTGCACGTCGGTGAACC",
                                "AATCCACCAGCTCCACGTGCAATGTTGGCCTA"
                        ),
                        8,
                        5,
                        100,
                        1000
                )
        );
    }
}