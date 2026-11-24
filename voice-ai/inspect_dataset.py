#!/usr/bin/env python3
"""
Main Naija Pidgin - Dataset Inspector

Read-only inspection of exported approved voice recordings
and their metadata.

It does NOT modify, rename, move, upload or delete source files.

Usage:
    python inspect_dataset.py --audio-dir recordings_approved \
        --metadata metadata.csv
"""

import argparse
import csv
import json
import os
import sys
import wave

from pathlib import Path
from collections import Counter
from datetime import datetime


AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".flac",
    ".ogg", ".opus", ".webm", ".aac"
}

FILENAME_COLUMNS = [
    "filename", "file_name", "audio",
    "audio_file", "path", "file_path"
]

TRANSCRIPT_COLUMNS = [
    "transcript", "text", "sentence",
    "pidgin_text", "transcription", "content"
]

SPEAKER_COLUMNS = [
    "speaker_id", "worker_id", "contributor_id",
    "user_id", "speaker", "worker"
]

STATUS_COLUMNS = [
    "status", "admin_status", "approval_status"
]


def normalize(value):
    return str(value or "").strip().lower()


def find_column(headers, candidates):
    normalized = {
        normalize(header): header
        for header in headers
    }

    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]

    return None


def load_metadata(metadata_path):
    records = []

    with open(
        metadata_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        sample = file.read(8192)
        file.seek(0)

        try:
            dialect = csv.Sniffer().sniff(
                sample,
                delimiters=",\t;|"
            )
        except csv.Error:
            dialect = csv.excel

        reader = csv.DictReader(file, dialect=dialect)

        if not reader.fieldnames:
            raise ValueError(
                "Metadata file has no column headers."
            )

        headers = reader.fieldnames

        filename_col = find_column(
            headers, FILENAME_COLUMNS
        )

        transcript_col = find_column(
            headers, TRANSCRIPT_COLUMNS
        )

        speaker_col = find_column(
            headers, SPEAKER_COLUMNS
        )

        status_col = find_column(
            headers, STATUS_COLUMNS
        )

        if not filename_col:
            raise ValueError(
                "Could not find a filename column. "
                "Expected filename, file_name, audio_file or path."
            )

        for row_number, row in enumerate(reader, start=2):

            filename = str(
                row.get(filename_col) or ""
            ).strip()

            transcript = (
                str(row.get(transcript_col) or "").strip()
                if transcript_col else ""
            )

            speaker = (
                str(row.get(speaker_col) or "").strip()
                if speaker_col else ""
            )

            status = (
                str(row.get(status_col) or "").strip()
                if status_col else ""
            )

            records.append({
                "row_number": row_number,
                "filename": filename,
                "transcript": transcript,
                "speaker_id": speaker,
                "status": status
            })

    return records


def get_audio_duration(path):
    """
    WAV duration uses Python's built-in wave module.
    Other formats optionally use soundfile.
    """

    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as audio:
                frames = audio.getnframes()
                rate = audio.getframerate()

                if rate:
                    return round(frames / rate, 2)

        except Exception:
            pass

    try:
        import soundfile as sf

        info = sf.info(str(path))
        return round(info.duration, 2)

    except ImportError:
        return None

    except Exception:
        return None


def scan_audio(audio_dir):
    files = []

    for path in audio_dir.rglob("*"):
        if (
            path.is_file()
            and path.suffix.lower() in AUDIO_EXTENSIONS
        ):
            files.append(path)

    return sorted(files)


def main():

    parser = argparse.ArgumentParser(
        description="Inspect Main Naija Pidgin voice dataset."
    )

    parser.add_argument(
        "--audio-dir",
        required=True,
        help="Folder containing exported approved recordings."
    )

    parser.add_argument(
        "--metadata",
        required=True,
        help="CSV or TSV file containing recording metadata."
    )

    parser.add_argument(
        "--approved-only",
        action="store_true",
        help="Include only records marked approved."
    )

    args = parser.parse_args()

    audio_dir = Path(args.audio_dir).resolve()
    metadata_path = Path(args.metadata).resolve()

    if not audio_dir.is_dir():
        print("ERROR: Audio folder does not exist.")
        sys.exit(1)

    if not metadata_path.is_file():
        print("ERROR: Metadata file does not exist.")
        sys.exit(1)

    print("\nMAIN NAIJA PIDGIN DATASET INSPECTOR")
    print("=" * 45)

    print("\nReading metadata...")

    try:
        records = load_metadata(metadata_path)

    except Exception as error:
        print(f"ERROR: {error}")
        sys.exit(1)

    if args.approved_only:
        records = [
            record for record in records
            if normalize(record["status"]) in {
                "approved", "approve", "accepted"
            }
        ]

    print("Scanning audio files...")

    audio_files = scan_audio(audio_dir)

    audio_lookup = {}

    for path in audio_files:
        relative = str(path.relative_to(audio_dir))

        audio_lookup[normalize(relative)] = path
        audio_lookup[normalize(path.name)] = path

    matched = []
    missing_audio = []
    missing_transcripts = []
    unknown_speakers = []
    durations = []
    speakers = Counter()
    duplicate_names = Counter()

    used_audio = set()

    for record in records:

        filename = record["filename"]

        if not filename:
            missing_audio.append({
                **record,
                "reason": "Empty filename"
            })
            continue

        key = normalize(filename.replace("\\", "/"))
        basename = normalize(Path(filename).name)

        audio_path = (
            audio_lookup.get(key)
            or audio_lookup.get(basename)
        )

        duplicate_names[basename] += 1

        if audio_path is None:
            missing_audio.append({
                **record,
                "reason": "Audio file not found"
            })
            continue

        used_audio.add(str(audio_path))

        duration = get_audio_duration(audio_path)

        if duration is not None:
            durations.append(duration)

        if not record["transcript"]:
            missing_transcripts.append(record)

        if not record["speaker_id"]:
            unknown_speakers.append(record)
        else:
            speakers[record["speaker_id"]] += 1

        matched.append({
            "filename": filename,
            "actual_file": str(
                audio_path.relative_to(audio_dir)
            ),
            "speaker_id": record["speaker_id"],
            "transcript": record["transcript"],
            "duration_seconds": duration,
            "metadata_row": record["row_number"]
        })

    unmatched_audio = [
        str(path.relative_to(audio_dir))
        for path in audio_files
        if str(path) not in used_audio
    ]

    duplicate_metadata = [
        name for name, count in duplicate_names.items()
        if count > 1
    ]

    total_duration = sum(durations)

    report = {
        "project": "Main Naija Pidgin",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "audio_directory": str(audio_dir),
        "metadata_file": str(metadata_path),

        "summary": {
            "metadata_records": len(records),
            "audio_files_found": len(audio_files),
            "matched_recordings": len(matched),
            "missing_audio_records": len(missing_audio),
            "missing_transcripts": len(missing_transcripts),
            "missing_speaker_ids": len(unknown_speakers),
            "unmatched_audio_files": len(unmatched_audio),
            "duplicate_metadata_filenames": len(
                duplicate_metadata
            ),
            "speakers_found": len(speakers),
            "audio_duration_readable": len(durations),
            "total_readable_audio_seconds": round(
                total_duration, 2
            ),
            "total_readable_audio_hours": round(
                total_duration / 3600, 3
            )
        },

        "speaker_recording_counts": dict(speakers),
        "matched_recordings": matched,
        "missing_audio": missing_audio,
        "missing_transcripts": missing_transcripts,
        "missing_speaker_ids": unknown_speakers,
        "unmatched_audio_files": unmatched_audio,
        "duplicate_metadata_filenames": duplicate_metadata
    }

    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)

    report_path = reports_dir / "dataset_inspection.json"

    with open(
        report_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            report,
            file,
            indent=2,
            ensure_ascii=False
        )

    summary_path = reports_dir / "dataset_summary.txt"

    with open(
        summary_path,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(
            "MAIN NAIJA PIDGIN DATASET REPORT\n"
        )

        file.write("=" * 40 + "\n\n")

        for key, value in report["summary"].items():
            file.write(f"{key}: {value}\n")

        file.write("\nSPEAKER COUNTS\n")
        file.write("-" * 30 + "\n")

        for speaker, count in speakers.most_common():
            file.write(f"{speaker}: {count} recordings\n")

    print("\nINSPECTION COMPLETE")
    print("=" * 45)

    for key, value in report["summary"].items():
        print(f"{key}: {value}")

    print("\nReports saved:")
    print(report_path)
    print(summary_path)

    print("\nOriginal recordings were not modified.")


if __name__ == "__main__":
    main()