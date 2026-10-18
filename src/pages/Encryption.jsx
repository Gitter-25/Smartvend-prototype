/**
 * Card security screen: display stored ciphertext and keyed lookups without exposing decrypted
 * enrolled UIDs.
 */

import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';

/**
 * Render the Card security page with saved AES ciphertext and HMAC lookups. The filename is
 * retained for the existing route.
 */
export default function Encryption() {
  const { cards, students } = useData();

  return (
    <>
      {/* Introduce the enrolled-card protection records shown by Card security. */}
      <PageHeading
        title="Card security"
        description="View encrypted identifiers saved for enrolled student cards."
      />

      {/* Explain the stored encryption fields, then display them without decrypting any UID. */}
      <section className="card">
        <h3>What is saved for enrolled cards?</h3>
        <p>
          The record contains AES ciphertext, an IV, and a keyed HMAC lookup. Base64 is only a
          display encoding. HMAC is hashing, not another form of encryption.
        </p>

        {/* Allow long Base64 values to stay inside a scrollable table area. */}
        <div className="table-wrap">
          <table>
            {/* Label the student owner, AES ciphertext, and keyed HMAC lookup columns. */}
            <thead>
              <tr>
                <th>Student</th>
                <th>AES ciphertext</th>
                <th>HMAC lookup</th>
              </tr>
            </thead>

            {/* Render one protection record for every enrolled card. */}
            <tbody>
              {cards.map(
                // Render one encrypted card record without decrypting its UID for display.
                (card) => (
                  <tr key={card.id}>
                    {/*
                      Join the student name to this card and display its two stored protection
                      values.
                    */}
                    {/*
                      Resolve the card owner through studentId rather than exposing the plaintext
                      card UID.
                    */}
                    <td>
                      {
                        students.find(
                          // Find the student name belonging to this encrypted card record.
                          (student) => student.id === card.studentId,
                        )?.name
                      }
                    </td>

                    {/* Display the Base64 AES-GCM ciphertext, including its authentication tag. */}
                    <td>
                      <code className="ciphertext-cell">{card.envelope.ciphertext}</code>
                    </td>

                    {/* Display the HMAC lookup; this is a keyed hash and cannot be decrypted. */}
                    <td>
                      <code className="ciphertext-cell">{card.lookup}</code>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {/* Clarify browser-local key storage and the prototype's access-control limits. */}
        <p className="scope-note">
          Keys and records stay in this browser profile. This demonstrates encryption; a
          frontend-only prototype does not provide production access control.
        </p>
      </section>
    </>
  );
}
